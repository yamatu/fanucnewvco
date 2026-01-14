const axios = require('axios');

// 说明：避免在脚本中硬编码账号/密码；优先从环境变量读取
// - API_BASE：例如 http://localhost:8080/api/v1
// - ADMIN_USERNAME / ADMIN_PASSWORD：管理员账号密码（仅用于本地/测试）
const API_BASE = process.env.API_BASE || 'http://localhost:8080/api/v1';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// Sample product data
const sampleProducts = [
  {
    name: 'FANUC A02B-0120-C041 Servo Drive',
    sku: 'A02B-0120-C041',
    slug: 'fanuc-a02b-0120-c041-servo-drive',
    short_description: 'High-performance servo drive for industrial automation',
    description: 'The FANUC A02B-0120-C041 is a state-of-the-art servo drive designed for precision control in industrial automation applications. Features advanced motion control algorithms and robust construction for reliable operation in demanding environments.',
    price: 2850.00,
    compare_price: 3200.00,
    cost_price: 2100.00,
    stock_quantity: 25,
    min_stock_level: 5,
    weight: 2.5,
    dimensions: '200x150x100mm',
    brand: 'FANUC',
    category_id: 1, // Will be updated with actual category ID
    is_active: true,
    is_featured: true,
    meta_title: 'FANUC A02B-0120-C041 Servo Drive - High Performance',
    meta_description: 'Buy FANUC A02B-0120-C041 servo drive for industrial automation. High-performance, reliable, and precision control.',
    meta_keywords: 'FANUC, servo drive, A02B-0120-C041, industrial automation, motion control',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=500&h=500&fit=crop&crop=center',
        filename: 'servo-drive-1.jpg',
        original_name: 'FANUC Servo Drive Main Image',
        is_primary: true
      },
      {
        url: 'https://images.unsplash.com/photo-1581092795442-6d4b3b8e5b8e?w=500&h=500&fit=crop&crop=center',
        filename: 'servo-drive-2.jpg',
        original_name: 'FANUC Servo Drive Detail',
        is_primary: false
      }
    ]
  },
  {
    name: 'FANUC A860-0360-T001 Encoder',
    sku: 'A860-0360-T001',
    slug: 'fanuc-a860-0360-t001-encoder',
    short_description: 'Precision absolute encoder for servo motors',
    description: 'The FANUC A860-0360-T001 is a high-resolution absolute encoder designed for use with FANUC servo motors. Provides accurate position feedback with excellent repeatability and long-term stability.',
    price: 1950.00,
    compare_price: 2200.00,
    cost_price: 1400.00,
    stock_quantity: 18,
    min_stock_level: 3,
    weight: 0.8,
    dimensions: '80x80x50mm',
    brand: 'FANUC',
    category_id: 1, // Will be updated with actual category ID
    is_active: true,
    is_featured: false,
    meta_title: 'FANUC A860-0360-T001 Absolute Encoder',
    meta_description: 'High-precision FANUC A860-0360-T001 absolute encoder for servo motor position feedback.',
    meta_keywords: 'FANUC, encoder, A860-0360-T001, absolute encoder, servo motor, position feedback',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=500&h=500&fit=crop&crop=center',
        filename: 'encoder-1.jpg',
        original_name: 'FANUC Encoder Main Image',
        is_primary: true
      },
      {
        url: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=500&h=500&fit=crop&crop=center',
        filename: 'encoder-2.jpg',
        original_name: 'FANUC Encoder Detail',
        is_primary: false
      }
    ]
  },
  {
    name: 'FANUC 10S-3000 Spindle Motor',
    sku: '10S-3000',
    slug: 'fanuc-10s-3000-spindle-motor',
    short_description: 'High-speed spindle motor for machining centers',
    description: 'The FANUC 10S-3000 is a high-speed spindle motor designed for machining centers and CNC machines. Delivers exceptional performance with speeds up to 15,000 RPM and superior surface finish quality.',
    price: 4200.00,
    compare_price: 4800.00,
    cost_price: 3200.00,
    stock_quantity: 8,
    min_stock_level: 2,
    weight: 15.5,
    dimensions: '300x200x200mm',
    brand: 'FANUC',
    category_id: 1, // Will be updated with actual category ID
    is_active: true,
    is_featured: true,
    meta_title: 'FANUC 10S-3000 High-Speed Spindle Motor',
    meta_description: 'FANUC 10S-3000 spindle motor for CNC machining centers. High-speed performance up to 15,000 RPM.',
    meta_keywords: 'FANUC, spindle motor, 10S-3000, CNC, machining center, high-speed',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?w=500&h=500&fit=crop&crop=center',
        filename: 'spindle-motor-1.jpg',
        original_name: 'FANUC Spindle Motor Main Image',
        is_primary: true
      },
      {
        url: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=500&h=500&fit=crop&crop=center',
        filename: 'spindle-motor-2.jpg',
        original_name: 'FANUC Spindle Motor Detail',
        is_primary: false
      }
    ]
  }
];

async function loginAdmin() {
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      username: ADMIN_USERNAME,
      password: ADMIN_PASSWORD
    });
    return response.data.data.token;
  } catch (error) {
    console.error('Login failed:', error.response?.data || error.message);
    throw error;
  }
}

async function getCategories(token) {
  try {
    const response = await axios.get(`${API_BASE}/admin/categories`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.data;
  } catch (error) {
    console.error('Failed to get categories:', error.response?.data || error.message);
    throw error;
  }
}

async function createProduct(productData, token) {
  try {
    const response = await axios.post(`${API_BASE}/admin/products`, productData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.data;
  } catch (error) {
    console.error('Failed to create product:', error.response?.data || error.message);
    throw error;
  }
}

async function addProductImages(productId, images, token) {
  try {
    for (const image of images) {
      // Create a FormData-like object for the image
      const imageData = {
        url: image.url,
        filename: image.filename,
        original_name: image.original_name,
        is_primary: image.is_primary
      };
      
      await axios.post(`${API_BASE}/admin/products/${productId}/images`, imageData, {
        headers: { Authorization: `Bearer ${token}` }
      });
    }
  } catch (error) {
    console.error('Failed to add product images:', error.response?.data || error.message);
    throw error;
  }
}

async function main() {
  try {
    console.log('Logging in as admin...');
    const token = await loginAdmin();
    console.log('Login successful!');

    console.log('Getting categories...');
    const categories = await getCategories(token);
    console.log(`Found ${categories.length} categories`);

    if (categories.length === 0) {
      console.error('No categories found. Please create categories first.');
      return;
    }

    const firstCategory = categories[0];
    console.log(`Using category: ${firstCategory.name} (ID: ${firstCategory.id})`);

    for (const productData of sampleProducts) {
      console.log(`Creating product: ${productData.name}...`);
      
      // Update category ID
      productData.category_id = firstCategory.id;
      
      // Extract images before creating product
      const images = productData.images;
      delete productData.images;
      
      // Create product
      const product = await createProduct(productData, token);
      console.log(`Product created with ID: ${product.id}`);
      
      // Add images
      console.log(`Adding ${images.length} images...`);
      await addProductImages(product.id, images, token);
      console.log('Images added successfully!');
    }

    console.log('All sample products created successfully!');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
