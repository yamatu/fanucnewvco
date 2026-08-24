package services

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

func TestParseProductWebEvidence(t *testing.T) {
	html := `<div class="result"><a class="result__a" href="https://example.com/acs800">ABB ACS800-104 Drive</a><a class="result__snippet">Variable frequency drive spare part</a></div>`
	results := parseProductWebEvidence(html, "https://html.duckduckgo.com/html/")
	if len(results) != 1 || results[0].Title != "ABB ACS800-104 Drive" {
		t.Fatalf("unexpected search evidence: %#v", results)
	}
}

func TestInferProductCategoryFromEvidenceCanResolveFallback(t *testing.T) {
	inference := InferProductCategoryFromEvidence("", "X123", "ABB X123 servo motor replacement")
	if !IsConfirmedProductCategory(inference, "X123") || inference.BrandKey != "abb" {
		t.Fatalf("expected web evidence to verify brand/type: %#v", inference)
	}
}

func TestInferProductCategoryFromEvidenceRequiresExactModel(t *testing.T) {
	inference := InferProductCategoryFromEvidence("", "X12", "ABB X123 servo motor replacement")
	if IsConfirmedProductCategory(inference, "X12") {
		t.Fatalf("a longer neighboring model must not verify the requested model: %#v", inference)
	}
}

func TestInferProductCategoryFromEvidenceRequiresBrandForUnknownInput(t *testing.T) {
	inference := InferProductCategoryFromEvidence("Acme", "X123", "X123 servo motor replacement")
	if IsConfirmedProductCategory(inference, "X123") {
		t.Fatalf("an unverified free-form brand must not be accepted without brand evidence: %#v", inference)
	}
}

func TestContainsExactProductIdentifierSupportsOptionCodes(t *testing.T) {
	if !containsExactProductIdentifier("FANUC A06B-6092-H275#H508 spindle amplifier", "A06B-6092-H275#H508") {
		t.Fatal("expected full option-code model to match")
	}
	if containsExactProductIdentifier("FANUC A06B-6092-H275#H508 spindle amplifier", "A06B-6092-H275") {
		t.Fatal("short base model should not be treated as an exact full identifier")
	}
}

func TestInferProductCategoryFromEvidenceSeparatesMotorAndDrive(t *testing.T) {
	motor := InferProductCategoryFromEvidence("", "X123", "ABB X123 servo motor replacement")
	if motor.PartType != "Servo Motor" || motor.CategorySlug != "servo-motors" {
		t.Fatalf("expected servo motor evidence, got %#v", motor)
	}
	drive := InferProductCategoryFromEvidence("", "X124", "ABB X124 servo drive replacement")
	if drive.PartType != "Servo Amplifier / Drive" || drive.CategorySlug != "servo-amplifiers-drives" {
		t.Fatalf("expected servo drive evidence, got %#v", drive)
	}
}

func TestInferProductCategoryFromEvidenceRecoversAdditionalBrandsAndEncoderType(t *testing.T) {
	tests := []struct {
		model, evidence, brand, partType string
	}{
		{model: "XOMRON-991", evidence: "OMRON XOMRON-991 input module", brand: "omron", partType: "I/O Module"},
		{model: "XSICK-991", evidence: "SICK XSICK-991 photoelectric sensor", brand: "sick", partType: "Photoelectric Sensor"},
		{model: "XTAM-991", evidence: "Tamagawa XTAM-991 rotary encoder", brand: "tamagawa", partType: "Encoder / Feedback"},
		{model: "XFLUKE-991", evidence: "FLUKE XFLUKE-991 power supply", brand: "fluke", partType: "Power Supply Unit"},
	}
	for _, tt := range tests {
		t.Run(tt.brand, func(t *testing.T) {
			inference := InferProductCategoryFromEvidence("", tt.model, tt.evidence)
			if inference.BrandKey != tt.brand || inference.PartType != tt.partType || !IsConfirmedProductCategory(inference, tt.model) {
				t.Fatalf("unexpected evidence inference: %#v", inference)
			}
		})
	}
}

func TestProductWebSearchManagerCachesAndExpiresSuccessfulResults(t *testing.T) {
	var calls atomic.Int32
	clock := time.Date(2026, time.August, 24, 10, 0, 0, 0, time.UTC)
	manager := newProductWebSearchManager(2, time.Minute, time.Second, func(_ context.Context, brand, model string) ([]ProductWebEvidence, error) {
		calls.Add(1)
		return []ProductWebEvidence{{Title: brand + " " + model}}, nil
	})
	manager.now = func() time.Time { return clock }

	first, err := manager.search(context.Background(), "abb", "acs800")
	if err != nil {
		t.Fatalf("first lookup failed: %v", err)
	}
	first[0].Title = "caller mutation"
	second, err := manager.search(context.Background(), "ABB", "ACS800")
	if err != nil {
		t.Fatalf("cached lookup failed: %v", err)
	}
	if calls.Load() != 1 {
		t.Fatalf("expected one provider call before expiry, got %d", calls.Load())
	}
	if second[0].Title != "ABB ACS800" {
		t.Fatalf("cached evidence was mutated through caller-owned slice: %#v", second)
	}

	clock = clock.Add(time.Minute + time.Nanosecond)
	if _, err := manager.search(context.Background(), "ABB", "ACS800"); err != nil {
		t.Fatalf("lookup after expiry failed: %v", err)
	}
	if calls.Load() != 2 {
		t.Fatalf("expected cache expiry to trigger a second provider call, got %d", calls.Load())
	}
}

func TestProductWebSearchManagerDeduplicatesInflightLookup(t *testing.T) {
	var calls atomic.Int32
	started := make(chan struct{})
	release := make(chan struct{})
	manager := newProductWebSearchManager(4, time.Minute, time.Second, func(_ context.Context, _, _ string) ([]ProductWebEvidence, error) {
		if calls.Add(1) == 1 {
			close(started)
		}
		<-release
		return []ProductWebEvidence{{Title: "ABB ACS800 drive"}}, nil
	})

	const lookups = 12
	begin := make(chan struct{})
	errCh := make(chan error, lookups)
	var ready sync.WaitGroup
	ready.Add(lookups)
	for range lookups {
		go func() {
			ready.Done()
			<-begin
			results, err := manager.search(context.Background(), "ABB", "ACS800")
			if err == nil && len(results) != 1 {
				err = fmt.Errorf("unexpected results: %#v", results)
			}
			errCh <- err
		}()
	}
	ready.Wait()
	close(begin)
	<-started
	close(release)

	for range lookups {
		if err := <-errCh; err != nil {
			t.Fatalf("deduplicated lookup failed: %v", err)
		}
	}
	if calls.Load() != 1 {
		t.Fatalf("expected identical concurrent lookups to share one provider call, got %d", calls.Load())
	}
}

func TestProductWebSearchManagerLimitsDistinctConcurrentLookups(t *testing.T) {
	var active atomic.Int32
	var maximum atomic.Int32
	started := make(chan struct{}, 6)
	release := make(chan struct{})
	manager := newProductWebSearchManager(2, time.Minute, time.Second, func(_ context.Context, _, model string) ([]ProductWebEvidence, error) {
		current := active.Add(1)
		for {
			observed := maximum.Load()
			if current <= observed || maximum.CompareAndSwap(observed, current) {
				break
			}
		}
		started <- struct{}{}
		<-release
		active.Add(-1)
		return []ProductWebEvidence{{Title: model}}, nil
	})

	const lookups = 6
	errCh := make(chan error, lookups)
	for index := range lookups {
		go func() {
			_, err := manager.search(context.Background(), "ABB", fmt.Sprintf("MODEL-%d", index))
			errCh <- err
		}()
	}
	<-started
	<-started
	select {
	case <-started:
		t.Fatal("more searches started than the global concurrency limit permits")
	case <-time.After(50 * time.Millisecond):
	}
	close(release)
	for range lookups {
		if err := <-errCh; err != nil {
			t.Fatalf("limited lookup failed: %v", err)
		}
	}
	if maximum.Load() != 2 {
		t.Fatalf("expected two concurrent provider calls, observed %d", maximum.Load())
	}
}

func TestProductWebSearchManagerWaiterCanCancelWithoutCancelingSharedLookup(t *testing.T) {
	var calls atomic.Int32
	started := make(chan struct{})
	release := make(chan struct{})
	manager := newProductWebSearchManager(1, time.Minute, time.Second, func(_ context.Context, _, _ string) ([]ProductWebEvidence, error) {
		calls.Add(1)
		close(started)
		<-release
		return []ProductWebEvidence{{Title: "ABB ACS800 drive"}}, nil
	})

	leaderDone := make(chan error, 1)
	go func() {
		_, err := manager.search(context.Background(), "ABB", "ACS800")
		leaderDone <- err
	}()
	<-started

	waiterCtx, cancel := context.WithCancel(context.Background())
	cancel()
	if _, err := manager.search(waiterCtx, "ABB", "ACS800"); !errors.Is(err, context.Canceled) {
		t.Fatalf("expected canceled waiter to return its context error, got %v", err)
	}
	close(release)
	if err := <-leaderDone; err != nil {
		t.Fatalf("leader lookup failed: %v", err)
	}
	if _, err := manager.search(context.Background(), "ABB", "ACS800"); err != nil {
		t.Fatalf("cached lookup after waiter cancellation failed: %v", err)
	}
	if calls.Load() != 1 {
		t.Fatalf("waiter cancellation should not start or cancel another provider call, got %d calls", calls.Load())
	}
}

func TestProductWebSearchManagerDoesNotCacheCanceledLeader(t *testing.T) {
	var calls atomic.Int32
	manager := newProductWebSearchManager(1, time.Minute, time.Minute, func(ctx context.Context, _, model string) ([]ProductWebEvidence, error) {
		calls.Add(1)
		if err := ctx.Err(); err != nil {
			return nil, err
		}
		return []ProductWebEvidence{{Title: model}}, nil
	})

	canceled, cancel := context.WithCancel(context.Background())
	cancel()
	if _, err := manager.search(canceled, "ABB", "ACS800"); !errors.Is(err, context.Canceled) {
		t.Fatalf("expected canceled leader lookup, got %v", err)
	}
	if _, err := manager.search(context.Background(), "ABB", "ACS800"); err != nil {
		t.Fatalf("fresh lookup after cancellation failed: %v", err)
	}
	if calls.Load() != 1 {
		t.Fatalf("canceled lookup should not be cached or invoke the provider, got %d provider calls", calls.Load())
	}
}
