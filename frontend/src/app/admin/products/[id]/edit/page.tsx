'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import Image from 'next/image';
import {
  ArrowLeftIcon,
  XMarkIcon,
  PencilIcon,
  LinkIcon,
  PlusIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  StarIcon,
  DocumentPlusIcon,
  PhotoIcon,
  CloudArrowUpIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import AdminLayout from '@/components/admin/AdminLayout';
import MediaPickerModal from '@/components/admin/MediaPickerModal';
import SeoPreview from '@/components/admin/SeoPreview';
import CategoryCombobox from '@/components/admin/CategoryCombobox';
import { ProductService, CategoryService } from '@/services';
import { queryKeys } from '@/lib/react-query';
import { ProductCreateRequest } from '@/types';
import { useAdminI18n } from '@/lib/admin-i18n';

interface ProductFormData extends Omit<ProductCreateRequest, 'images'> {
  images: FileList | null;
}

export default function EditProductPage() {
  const { locale, t } = useAdminI18n();
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const productId = Number(params.id);
  const returnTo = searchParams?.get('returnTo') || '';
  
  const [imageUrl, setImageUrl] = useState<string>('');
  const [images, setImages] = useState<any[]>([]);
  const [showImageForm, setShowImageForm] = useState<boolean>(false);
  const [showBatchImport, setShowBatchImport] = useState<boolean>(false);
  const [batchUrls, setBatchUrls] = useState<string>('');
  const [showMediaPicker, setShowMediaPicker] = useState<boolean>(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormData>();

  // Fetch product details
  const { data: product, isLoading } = useQuery({
    queryKey: queryKeys.products.detail(productId),
    queryFn: () => ProductService.getAdminProduct(productId),
    enabled: !!productId,
  });

  // Fetch categories for dropdown
  const { data: categories = [] } = useQuery({
    queryKey: queryKeys.categories.lists(),
    queryFn: () => CategoryService.getAdminCategories(),
  });

  // Update product mutation
  const updateProductMutation = useMutation({
    mutationFn: (data: Partial<ProductCreateRequest>) => 
      ProductService.updateProduct(productId, data),
    onSuccess: () => {
      toast.success(t('products.toast.updated', 'Product updated successfully!'));
      queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(productId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.lists() });
      // If we have a returnTo param, go back to list position
      if (returnTo) {
        router.push(returnTo);
      }
    },
    onError: (error: any) => {
      toast.error(error.message || t('products.toast.updateFailed', 'Failed to update product'));
    },
  });

  // Populate form when product data is loaded
  useEffect(() => {
    if (product) {
      setValue('name', product.name);
      setValue('sku', product.sku);
      setValue('description', product.description || '');
      setValue('meta_title', (product as any).meta_title || '');
      setValue('meta_description', (product as any).meta_description || '');
      setValue('meta_keywords', (product as any).meta_keywords || '');
      setValue('price', product.price);
      setValue('category_id', product.category_id);
      setValue('is_active', product.is_active);
      setValue('is_featured', product.is_featured);
      setValue('stock_quantity', product.stock_quantity);

      // Convert image_urls to the expected format for editing
      try {
        let urls: string[] = [];
        if (product.image_urls && Array.isArray(product.image_urls)) {
          urls = product.image_urls as any;
        } else if (product.image_urls && typeof (product as any).image_urls === 'string') {
          // Some admin endpoints may return JSON string; parse it
          const parsed = JSON.parse((product as any).image_urls || '[]');
          if (Array.isArray(parsed)) urls = parsed;
        }

        if (Array.isArray(urls) && urls.length > 0) {
          const imageObjects = urls.map((url, index) => ({
            id: Date.now() + index, // Generate temporary IDs
            url,
            alt_text: '',
            is_primary: index === 0, // First image is primary
            sort_order: index,
            product_id: productId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }));
          setImages(imageObjects);
        } else if ((product as any).images) {
          // Fallback: old API shape
          setImages((product as any).images || []);
        } else {
          setImages([]);
        }
      } catch (e) {
        console.warn('Failed to parse product.image_urls', e);
        setImages([]);
      }
    }
  }, [product, setValue]);

  // Fallback: if no images parsed but backend has them, fetch via images endpoint
  useEffect(() => {
    const fetchImagesIfMissing = async () => {
      if (!productId || !product) return;
      if (images.length > 0) return;
      try {
        // Try backend images list (reads JSON image_urls and maps to array)
        const list = await ProductService.getProductImages(productId);
        if (Array.isArray(list) && list.length > 0) {
          const normalized = list.map((img: any, i: number) => ({
            id: img.id ?? Date.now() + i,
            url: img.url,
            alt_text: img.alt_text || '',
            is_primary: !!img.is_primary || i === 0,
            sort_order: typeof img.sort_order === 'number' ? img.sort_order : i,
            product_id: productId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }));
          setImages(normalized);
        }
      } catch (err) {
        // Silently ignore; UI still allows adding images
        console.warn('Fallback getProductImages failed', err);
      }
    };
    fetchImagesIfMissing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, product]);



  // Image management functions
	  const handleAddImage = () => {
	    if (!imageUrl.trim()) {
	      toast.error(t('products.toast.imageUrlInvalid', 'Please enter a valid image URL'));
	      return;
	    }

    // Basic URL validation
	    try {
	      new URL(imageUrl);
	    } catch {
	      toast.error(t('products.toast.urlInvalid', 'Please enter a valid URL'));
	      return;
	    }

    // Add image to local state
    const newImage = {
      id: Date.now(), // Use timestamp as temporary ID
      url: imageUrl.trim(),
      alt_text: '',
      is_primary: images.length === 0, // First image is primary
      sort_order: images.length,
      product_id: productId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

	    setImages([...images, newImage]);
	    setImageUrl('');
	    setShowImageForm(false);
	    toast.success(t('products.toast.imageAdded', 'Image added successfully!'));
	  };

  // Batch import function
	  const handleBatchImport = () => {
	    if (!batchUrls.trim()) {
	      toast.error(t('products.toast.batchUrlsRequired', 'Please enter URLs to import'));
	      return;
	    }

    // Split by lines and filter out empty lines
    const urls = batchUrls
      .split('\n')
      .map(url => url.trim())
      .filter(url => url.length > 0);

	    if (urls.length === 0) {
	      toast.error(t('products.toast.noValidUrls', 'No valid URLs found'));
	      return;
	    }

    // Validate each URL
    const validUrls: string[] = [];
    const invalidUrls: string[] = [];

    urls.forEach(url => {
      try {
        new URL(url);
        validUrls.push(url);
      } catch {
        invalidUrls.push(url);
      }
    });

	    if (invalidUrls.length > 0) {
	      toast.error(t('products.toast.invalidUrlsFound', 'Found {count} invalid URLs. Please check and try again.', { count: invalidUrls.length }));
	      return;
	    }

    // Create new image objects
    const newImages = validUrls.map((url, index) => ({
      id: Date.now() + index, // Use timestamp + index for unique IDs
      url: url,
      alt_text: '',
      is_primary: images.length === 0 && index === 0, // First image is primary if no existing images
      sort_order: images.length + index,
      product_id: productId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    // Add to existing images
    setImages([...images, ...newImages]);
    setBatchUrls('');
    setShowBatchImport(false);
    toast.success(`Successfully imported ${validUrls.length} images!`);
  };

  // Clear all images function
  const handleClearAllImages = () => {
    if (images.length === 0) {
      toast.error('No images to clear');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to remove all ${images.length} images? This action cannot be undone.`
    );

    if (confirmed) {
      setImages([]);
      toast.success('All images have been cleared!');
    }
  };

  const removeImage = (imageId: number) => {
    if (window.confirm('Are you sure you want to delete this image?')) {
      const newImages = images.filter(img => img.id !== imageId);
      setImages(newImages);
      toast.success('Image removed successfully!');
    }
  };

  // Reorder helpers
  const moveImage = (index: number, direction: 'left' | 'right') => {
    const newIndex = direction === 'left' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= images.length) return;
    const updated = [...images];
    const [moved] = updated.splice(index, 1);
    updated.splice(newIndex, 0, moved);
    // recompute sort_order and primary flag
    const normalized = updated.map((img, i) => ({ ...img, sort_order: i, is_primary: i === 0 }));
    setImages(normalized);
  };

  const setAsPrimary = (index: number) => {
    if (index <= 0) return;
    const updated = [...images];
    const [moved] = updated.splice(index, 1);
    updated.unshift(moved);
    const normalized = updated.map((img, i) => ({ ...img, sort_order: i, is_primary: i === 0 }));
    setImages(normalized);
  };

  // Drag & drop reorder
  const onDragStart = (index: number) => setDragIndex(index);
  const onDragOver = (e: React.DragEvent) => e.preventDefault();
  const onDrop = (index: number) => {
    if (dragIndex === null || dragIndex === index) return;
    const updated = [...images];
    const [moved] = updated.splice(dragIndex, 1);
    updated.splice(index, 0, moved);
    const normalized = updated.map((img, i) => ({ ...img, sort_order: i, is_primary: i === 0 }));
    setImages(normalized);
    setDragIndex(null);
  };

  const onSubmit = async (data: ProductFormData) => {
    try {
      // Validate category matches one from server
      const catId = Number(data.category_id);
      const hasValidCategory = Array.isArray(categories) && categories.some((c: any) => Number(c.id) === catId);
      if (!catId || !hasValidCategory) {
        toast.error('Please select a valid category');
        return;
      }
      // Convert images to the format expected by the API
      const imageReqs = images.map((img, index) => ({
        url: img.url,
        alt_text: img.alt_text || '',
        is_primary: img.is_primary || index === 0,
        sort_order: img.sort_order || index
      }));

      // Convert form data to ProductCreateRequest
      const productData: Partial<ProductCreateRequest> = {
        name: data.name,
        sku: data.sku,
        description: data.description,
        meta_title: data.meta_title || '',
        meta_description: data.meta_description || '',
        meta_keywords: data.meta_keywords || '',
        price: Number(data.price),
        category_id: catId,
        is_active: data.is_active,
        is_featured: data.is_featured,
        stock_quantity: Number(data.stock_quantity),
        images: imageReqs,
      };

      await updateProductMutation.mutateAsync(productData);
    } catch (error) {
      console.error('Error updating product:', error);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  if (!product) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900">Product not found</h3>
          <p className="mt-1 text-sm text-gray-500">
            The product you're trying to edit doesn't exist.
          </p>
          <div className="mt-6">
            <button
              onClick={() => router.push('/admin/products')}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Back to Products
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Back
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Edit Product</h1>
              <p className="mt-1 text-sm text-gray-500">
                Update product information for {product.name}
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Information */}
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
                
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      Product Name *
                    </label>
                    <input
                      {...register('name', { required: 'Product name is required' })}
                      type="text"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., FANUC A02B-0120-C041"
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="sku" className="block text-sm font-medium text-gray-700 mb-1">
                      SKU *
                    </label>
                    <input
                      {...register('sku', { required: 'SKU is required' })}
                      type="text"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., A02B-0120-C041"
                    />
                    {errors.sku && (
                      <p className="mt-1 text-sm text-red-600">{errors.sku.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                      Price *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">$</span>
                      </div>
                      <input
                        {...register('price', { 
                          required: 'Price is required',
                          min: { value: 0, message: 'Price must be positive' }
                        })}
                        type="number"
                        step="0.01"
                        className="block w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0.00"
                      />
                    </div>
                    {errors.price && (
                      <p className="mt-1 text-sm text-red-600">{errors.price.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="category_id" className="block text-sm font-medium text-gray-700 mb-1">
                      Category *
                    </label>

					{/* Hidden field for react-hook-form validation/submission */}
					<input
						type="hidden"
						{...register('category_id', { required: 'Category is required' })}
					/>
					<CategoryCombobox
						categories={Array.isArray(categories) ? categories : []}
						value={watch('category_id') as any}
						onChange={(categoryId) =>
							setValue('category_id', categoryId as any, { shouldDirty: true, shouldValidate: true })
						}
						placeholder="Type to search categories (name / path / slug)"
					/>
                    {errors.category_id && (
                      <p className="mt-1 text-sm text-red-600">{errors.category_id.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="stock_quantity" className="block text-sm font-medium text-gray-700 mb-1">
                      Stock Quantity
                    </label>
                    <input
                      {...register('stock_quantity', { 
                        min: { value: 0, message: 'Stock quantity must be positive' }
                      })}
                      type="number"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0"
                    />
                    {errors.stock_quantity && (
                      <p className="mt-1 text-sm text-red-600">{errors.stock_quantity.message}</p>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      {...register('description')}
                      rows={4}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Product description..."
                    />
                  </div>
            </div>
          </div>

          {/* SEO Basic Information */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">SEO Basic Information</h3>
            <p className="text-sm text-gray-500 mb-4">These fields control how your product appears in search engines and social previews.</p>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label htmlFor="meta_title" className="block text-sm font-medium text-gray-700 mb-1">
                  SEO Title
                </label>
                <input
                  {...register('meta_title')}
                  type="text"
                  maxLength={70}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., FANUC A16B-2202-0420 Power Supply | In Stock"
                />
                <p className="mt-1 text-xs text-gray-500">Recommended 50–60 characters. Include SKU and category.</p>
              </div>

              <div>
                <label htmlFor="meta_description" className="block text-sm font-medium text-gray-700 mb-1">
                  SEO Description
                </label>
                <textarea
                  {...register('meta_description')}
                  rows={3}
                  maxLength={180}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., FANUC A16B-2202-0420 24V Power Supply, USD $506, In Stock, 1-Year Warranty, Fast Global Shipping."
                />
                <p className="mt-1 text-xs text-gray-500">Recommended 150–160 characters. Mention price, availability, warranty, shipping.</p>
              </div>

              <div>
                <label htmlFor="meta_keywords" className="block text-sm font-medium text-gray-700 mb-1">
                  SEO Keywords (optional)
                </label>
                <input
                  {...register('meta_keywords')}
                  type="text"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., A16B-2202-0420, A16B22020420, power supply, 24V"
                />
                <p className="mt-1 text-xs text-gray-500">Comma-separated keywords. Include alternate SKU format.</p>
              </div>
            </div>

            {/* Live SERP Preview */}
            <SeoPreview
              title={watch('meta_title')}
              description={watch('meta_description')}
              sku={watch('sku')}
              name={watch('name')}
            />
          </div>

          {/* Product Images */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Product Images</h3>
                
                <div className="space-y-4">




                  {/* External Images Section */}
                  <div className="border-t pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-medium text-gray-700">
                        Images (URLs) {images.length > 0 && <span className="text-gray-500">({images.length} images)</span>}
                      </h4>
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={() => setShowMediaPicker(true)}
                          className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <PhotoIcon className="h-4 w-4 mr-1" />
                          {locale === 'zh' ? '从图库选择' : 'Choose From Library'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowImageForm(!showImageForm);
                            setShowBatchImport(false);
                          }}
                          className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <LinkIcon className="h-4 w-4 mr-1" />
                          Add Single Image
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowBatchImport(!showBatchImport);
                            setShowImageForm(false);
                          }}
                          className="inline-flex items-center px-3 py-1 border border-transparent shadow-sm text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <CloudArrowUpIcon className="h-4 w-4 mr-1" />
                          Batch Import
                        </button>
                        {images.length > 0 && (
                          <button
                            type="button"
                            onClick={handleClearAllImages}
                            className="inline-flex items-center px-3 py-1 border border-red-300 shadow-sm text-xs font-medium rounded text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                          >
                            <TrashIcon className="h-4 w-4 mr-1" />
                            Clear All ({images.length})
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Single Image Form */}
                    {showImageForm && (
                      <div className="mb-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                        <div className="space-y-3">
                          <div>
                            <label htmlFor="image-url" className="block text-sm font-medium text-gray-700 mb-1">
                              Image URL *
                            </label>
                            <input
                              id="image-url"
                              type="url"
                              value={imageUrl}
                              onChange={(e) => setImageUrl(e.target.value)}
                              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                              placeholder="https://example.com/image.jpg"
                            />
                          </div>
                          <div className="flex space-x-2">
                            <button
                              type="button"
                              onClick={handleAddImage}
                              disabled={!imageUrl.trim()}
                              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <PlusIcon className="h-4 w-4 mr-1" />
                              Add Image
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setShowImageForm(false);
                                setImageUrl('');
                              }}
                              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Batch Import Form */}
                    {showBatchImport && (
                      <div className="mb-4 p-4 border border-blue-200 rounded-lg bg-blue-50">
                        <div className="space-y-3">
                          <div>
                            <label htmlFor="batch-urls" className="block text-sm font-medium text-gray-700 mb-1">
                              Batch Import URLs (one per line) *
                            </label>
                            <textarea
                              id="batch-urls"
                              rows={8}
                              value={batchUrls}
                              onChange={(e) => setBatchUrls(e.target.value)}
                              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                              placeholder={`https://dz.yamatu.xyz/i/2025/09/22/A06B-6079-H121_-_57-3.webp
https://dz.yamatu.xyz/i/2025/09/22/A06B-6079-H121_-_57-2.webp
https://dz.yamatu.xyz/i/2025/09/22/A06B-6079-H121_-_57-1.webp
https://dz.yamatu.xyz/i/2025/09/22/A06B-6079-H121_-_57.webp
https://dz.yamatu.xyz/i/2025/09/22/A06B-6079-H121_-_57-5.webp`}
                            />
                            <p className="mt-1 text-xs text-gray-500">
                              Enter each image URL on a new line. All URLs will be validated before importing.
                            </p>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              type="button"
                              onClick={handleBatchImport}
                              disabled={!batchUrls.trim()}
                              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <CloudArrowUpIcon className="h-4 w-4 mr-2" />
                              Import All URLs
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setShowBatchImport(false);
                                setBatchUrls('');
                              }}
                              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Images Display + Reorder */}
                    {images.length > 0 && (
                      <div>
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                          {images.map((image, index) => (
                            <div
                              key={image.id || index}
                              className="relative cursor-move"
                              draggable
                              onDragStart={() => onDragStart(index)}
                              onDragOver={onDragOver}
                              onDrop={() => onDrop(index)}
                            >
                              <div className="relative h-24 w-full">
                                <Image
                                  src={image.url}
                                  alt={image.alt_text || `Image ${index + 1}`}
                                  fill
                                  unoptimized
                                  sizes="120px"
                                  className="object-cover rounded-lg"
                                  onError={(e) => {
                                    const target = e.target as any;
                                    if (target && target.src) {
                                      target.src = '/images/placeholder-image.png';
                                    }
                                  }}
                                />
                              </div>
                              <div className="absolute top-1 left-1">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  <LinkIcon className="h-3 w-3 mr-1" />
                                  URL
                                </span>
                              </div>
                              <div className="absolute bottom-1 left-1">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-white/90 border text-gray-600">
                                  Drag to reorder
                                </span>
                              </div>
                              {index === 0 && (
                                <div className="absolute top-1 right-1">
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                    <StarIcon className="h-3 w-3 mr-1" />
                                    Main
                                  </span>
                                </div>
                              )}
                              <button
                                type="button"
                                onClick={() => removeImage(image.id)}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                              >
                                <XMarkIcon className="h-4 w-4" />
                              </button>
                              {/* Reorder controls */}
                              <div className="absolute -bottom-2 left-1 right-1 flex items-center justify-between">
                                <button
                                  type="button"
                                  onClick={() => moveImage(index, 'left')}
                                  className="bg-white/90 backdrop-blur px-1.5 py-1 rounded shadow border hover:bg-white disabled:opacity-50"
                                  disabled={index === 0}
                                  title="Move left"
                                >
                                  <ChevronLeftIcon className="h-4 w-4 text-gray-700" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setAsPrimary(index)}
                                  className="bg-white/90 backdrop-blur px-2 py-1 rounded shadow border hover:bg-white"
                                  title="Set as main"
                                >
                                  <StarIcon className="h-4 w-4 text-yellow-600" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moveImage(index, 'right')}
                                  className="bg-white/90 backdrop-blur px-1.5 py-1 rounded shadow border hover:bg-white disabled:opacity-50"
                                  disabled={index === images.length - 1}
                                  title="Move right"
                                >
                                  <ChevronRightIcon className="h-4 w-4 text-gray-700" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {images.length === 0 && !showImageForm && (
                      <div className="text-center py-6 text-gray-500 text-sm">
                        No images added yet. Click "Add Image" to add images from URLs.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Status */}
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Status</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center">
                    <input
                      {...register('is_active')}
                      id="is_active"
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                      Active
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      {...register('is_featured')}
                      id="is_featured"
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="is_featured" className="ml-2 block text-sm text-gray-900">
                      Featured Product
                    </label>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="bg-white shadow rounded-lg p-6">
                <div className="space-y-4">
                  <button
                    type="submit"
                    disabled={isSubmitting || updateProductMutation.isPending}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting || updateProductMutation.isPending ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Updating...
                      </div>
                    ) : (
                      <>
                        <PencilIcon className="h-4 w-4 mr-2" />
                        Update Product
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>

      <MediaPickerModal
        open={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        multiple={true}
        title="Select product images"
        onSelect={(assets) => {
          setImages((prev) => {
            const existing = new Set(prev.map((p: any) => p.url));
            const next = [...prev];
            let isPrimaryAvailable = next.length === 0;
            for (let i = 0; i < assets.length; i++) {
              const a = assets[i];
              if (existing.has(a.url)) continue;
              next.push({
                id: Date.now() + i,
                url: a.url,
                alt_text: a.alt_text || '',
                is_primary: isPrimaryAvailable,
                sort_order: next.length,
                product_id: productId,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              });
              existing.add(a.url);
              if (isPrimaryAvailable) isPrimaryAvailable = false;
            }
            return next;
          });
          toast.success(t('products.toast.addedFromLibrary', 'Added from media library'));
        }}
      />
    </AdminLayout>
  );
}
