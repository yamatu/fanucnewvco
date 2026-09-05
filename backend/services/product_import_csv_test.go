package services

import (
	"strings"
	"testing"
)

func TestReadProductQuoteCSVHandlesBOMQuotedPriceAndDuplicates(t *testing.T) {
	input := "\ufeff品牌,型号,价格,交期\nABB,3ABD00045441-D,\"$4,833\",3-4 DAYS\nABB,3ABD00045441-D,,5 DAYS\nSiemens,6ES7-TEST,,\n"
	rows, duplicates, total, err := readProductQuoteCSV(strings.NewReader(input))
	if err != nil {
		t.Fatalf("readProductQuoteCSV() error = %v", err)
	}
	if total != 3 || len(rows) != 2 || len(duplicates) != 1 {
		t.Fatalf("unexpected counts: total=%d rows=%d duplicates=%d", total, len(rows), len(duplicates))
	}
	if rows[0].Model != "3ABD00045441-D" || !rows[0].HasPrice || rows[0].Price != 4833 || rows[0].LeadTime != "5 DAYS" {
		t.Fatalf("unexpected merged row: %#v", rows[0])
	}
	if rows[1].HasPrice || rows[1].Brand != "Siemens" {
		t.Fatalf("unexpected quote-only row: %#v", rows[1])
	}
}

func TestReadProductQuoteCSVSupportsEnglishHeaders(t *testing.T) {
	input := "Brand,SKU,Price,Lead Time\nAllen Bradley,1756-L83E,USD 12,7 days\n"
	rows, _, _, err := readProductQuoteCSV(strings.NewReader(input))
	if err != nil {
		t.Fatalf("readProductQuoteCSV() error = %v", err)
	}
	if len(rows) != 1 || rows[0].Brand != "Allen-Bradley" || rows[0].Price != 12 || rows[0].LeadTime != "7 days" {
		t.Fatalf("unexpected row: %#v", rows)
	}
}

func TestReadProductQuoteCSVRequiresModelColumn(t *testing.T) {
	_, _, _, err := readProductQuoteCSV(strings.NewReader("品牌,价格\nABB,100\n"))
	if err == nil {
		t.Fatal("expected missing model header error")
	}
}

func TestParseQuoteCSVPriceTreatsQuoteIndicatorsAsBlank(t *testing.T) {
	for _, value := range []string{"Contact for quote", "待报价", "联系询价", "N/A", "-"} {
		price, hasPrice, err := parseQuoteCSVPrice(value)
		if err != nil || hasPrice || price != 0 {
			t.Fatalf("parseQuoteCSVPrice(%q) = %v, %v, %v", value, price, hasPrice, err)
		}
	}
	if _, _, err := parseQuoteCSVPrice("not available"); err == nil {
		t.Fatal("expected invalid non-quote price to fail")
	}
}
