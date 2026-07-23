import swaggerJSDoc from 'swagger-jsdoc';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Korat Air & Sound POS API',
      version: '1.0.0',
      description: 'REST API สำหรับระบบ POS ร้าน Korat Air & Sound',
    },
    servers: [
      { url: '/api', description: 'Current server' },
      { url: 'https://korat-backend-171089417301.asia-southeast1.run.app/api', description: 'Production' },
    ],
    tags: [
      { name: 'Customers', description: 'ข้อมูลลูกค้า' },
      { name: 'Vehicles', description: 'ข้อมูลรถยนต์' },
      { name: 'Products', description: 'สินค้าและราคา' },
      { name: 'Orders', description: 'คำสั่งซื้อ' },
      { name: 'Reports', description: 'รายงานยอดขาย' },
      { name: 'Hardware', description: 'เครื่องพิมพ์ใบเสร็จ' },
    ],
    components: {
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
        Customer: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            phone: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Vehicle: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            licensePlate: { type: 'string' },
            brand: { type: 'string' },
            model: { type: 'string' },
            customerId: { type: 'string', format: 'uuid' },
          },
        },
        Product: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            sku: { type: 'string' },
            name: { type: 'string' },
            category: {
              type: 'string',
              enum: ['AirCon', 'Tint', 'Glass', 'CentralLock', 'Sound', 'ServiceFee'],
            },
            costPrice: { type: 'number' },
            sellingPrice: { type: 'number' },
            stockQuantity: { type: 'integer' },
            supplier: { type: 'string', nullable: true },
            brand: { type: 'string', nullable: true },
            squareFeet: { type: 'number', nullable: true },
            productDate: { type: 'string', format: 'date', nullable: true },
            modelYear: { type: 'integer', nullable: true },
          },
        },
        OrderItem: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            orderId: { type: 'string', format: 'uuid' },
            productId: { type: 'string', format: 'uuid', nullable: true },
            customLabel: { type: 'string', nullable: true },
            technicianName: { type: 'string', nullable: true },
            quantity: { type: 'integer' },
            unitPrice: { type: 'number' },
            subtotal: { type: 'number' },
          },
        },
        Order: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            orderNumber: { type: 'string' },
            status: { type: 'string', enum: ['Draft', 'Quoted', 'Paid', 'Cancelled'] },
            totalAmount: { type: 'number' },
            vehicleId: { type: 'string', format: 'uuid' },
            createdAt: { type: 'string', format: 'date-time' },
            vehicle: { $ref: '#/components/schemas/Vehicle' },
            orderItems: {
              type: 'array',
              items: { $ref: '#/components/schemas/OrderItem' },
            },
          },
        },
      },
    },
    paths: {
      // ── Customers ──────────────────────────────────────────────────────────
      '/customers': {
        get: {
          tags: ['Customers'],
          summary: 'รายการลูกค้าทั้งหมด (paginated)',
          parameters: [
            { name: 'q', in: 'query', schema: { type: 'string' }, description: 'ค้นหาชื่อหรือเบอร์โทร' },
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 20 } },
          ],
          responses: {
            200: {
              description: 'สำเร็จ',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      customers: { type: 'array', items: { $ref: '#/components/schemas/Customer' } },
                      total: { type: 'integer' },
                      page: { type: 'integer' },
                      pageSize: { type: 'integer' },
                      totalPages: { type: 'integer' },
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          tags: ['Customers'],
          summary: 'สร้างลูกค้าใหม่',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'phone'],
                  properties: {
                    name: { type: 'string' },
                    phone: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'สร้างสำเร็จ', content: { 'application/json': { schema: { $ref: '#/components/schemas/Customer' } } } },
            409: { description: 'เบอร์โทรซ้ำ', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/customers/search': {
        get: {
          tags: ['Customers'],
          summary: 'ค้นหาลูกค้า (สำหรับ POS)',
          parameters: [
            { name: 'q', in: 'query', required: true, schema: { type: 'string' }, description: 'ชื่อหรือเบอร์โทร' },
          ],
          responses: {
            200: { description: 'รายการลูกค้า', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Customer' } } } } },
          },
        },
      },
      '/customers/{id}': {
        get: {
          tags: ['Customers'],
          summary: 'ข้อมูลลูกค้าตาม ID',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: {
            200: { description: 'สำเร็จ', content: { 'application/json': { schema: { $ref: '#/components/schemas/Customer' } } } },
            404: { description: 'ไม่พบลูกค้า' },
          },
        },
        patch: {
          tags: ['Customers'],
          summary: 'แก้ไขข้อมูลลูกค้า',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    phone: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'แก้ไขสำเร็จ' },
            404: { description: 'ไม่พบลูกค้า' },
          },
        },
      },
      // ── Vehicles ───────────────────────────────────────────────────────────
      '/vehicles/search': {
        get: {
          tags: ['Vehicles'],
          summary: 'ค้นหารถ (ทะเบียนหรือเบอร์โทรเจ้าของ)',
          parameters: [
            { name: 'q', in: 'query', required: true, schema: { type: 'string' } },
          ],
          responses: {
            200: { description: 'รายการรถ', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Vehicle' } } } } },
          },
        },
      },
      '/vehicles/{id}': {
        get: {
          tags: ['Vehicles'],
          summary: 'ข้อมูลรถพร้อมประวัติออเดอร์',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: {
            200: { description: 'สำเร็จ' },
            404: { description: 'ไม่พบรถ' },
          },
        },
      },
      '/vehicles': {
        post: {
          tags: ['Vehicles'],
          summary: 'เพิ่มรถใหม่',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['licensePlate', 'brand', 'model', 'customerId'],
                  properties: {
                    licensePlate: { type: 'string' },
                    brand: { type: 'string' },
                    model: { type: 'string' },
                    customerId: { type: 'string', format: 'uuid' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'สร้างสำเร็จ', content: { 'application/json': { schema: { $ref: '#/components/schemas/Vehicle' } } } },
          },
        },
      },
      // ── Products ───────────────────────────────────────────────────────────
      '/products': {
        get: {
          tags: ['Products'],
          summary: 'รายการสินค้า',
          parameters: [
            { name: 'category', in: 'query', schema: { type: 'string', enum: ['AirCon', 'Tint', 'Glass', 'CentralLock', 'Sound', 'ServiceFee'] } },
            { name: 'q', in: 'query', schema: { type: 'string' }, description: 'ค้นหาชื่อหรือ SKU' },
          ],
          responses: {
            200: { description: 'รายการสินค้า', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Product' } } } } },
          },
        },
        post: {
          tags: ['Products'],
          summary: 'เพิ่มสินค้าใหม่',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Product' },
              },
            },
          },
          responses: {
            201: { description: 'สร้างสำเร็จ' },
            409: { description: 'SKU ซ้ำ' },
          },
        },
      },
      '/products/{id}': {
        get: {
          tags: ['Products'],
          summary: 'ข้อมูลสินค้าตาม ID',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: {
            200: { description: 'สำเร็จ' },
            404: { description: 'ไม่พบสินค้า' },
          },
        },
        put: {
          tags: ['Products'],
          summary: 'แก้ไขสินค้า (partial)',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          requestBody: {
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Product' } } },
          },
          responses: { 200: { description: 'แก้ไขสำเร็จ' }, 404: { description: 'ไม่พบสินค้า' } },
        },
        delete: {
          tags: ['Products'],
          summary: 'ลบสินค้า',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: { 204: { description: 'ลบสำเร็จ' }, 404: { description: 'ไม่พบสินค้า' } },
        },
      },
      // ── Orders ─────────────────────────────────────────────────────────────
      '/orders': {
        get: {
          tags: ['Orders'],
          summary: 'รายการออเดอร์',
          parameters: [
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['Draft', 'Quoted', 'Paid', 'Cancelled'] } },
          ],
          responses: {
            200: { description: 'รายการออเดอร์', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Order' } } } } },
          },
        },
        post: {
          tags: ['Orders'],
          summary: 'สร้างออเดอร์ใหม่ (Draft)',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['vehicleId'],
                  properties: { vehicleId: { type: 'string', format: 'uuid' } },
                },
              },
            },
          },
          responses: { 201: { description: 'สร้างสำเร็จ' }, 404: { description: 'ไม่พบรถ' } },
        },
      },
      '/orders/{id}': {
        get: {
          tags: ['Orders'],
          summary: 'ข้อมูลออเดอร์ตาม ID',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: { 200: { description: 'สำเร็จ' }, 404: { description: 'ไม่พบออเดอร์' } },
        },
        delete: {
          tags: ['Orders'],
          summary: 'ลบออเดอร์ (Draft เท่านั้น)',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: { 204: { description: 'ลบสำเร็จ' }, 400: { description: 'ลบได้เฉพาะ Draft' }, 404: { description: 'ไม่พบออเดอร์' } },
        },
      },
      '/orders/{id}/status': {
        patch: {
          tags: ['Orders'],
          summary: 'เปลี่ยนสถานะออเดอร์',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['status'],
                  properties: { status: { type: 'string', enum: ['Draft', 'Quoted', 'Cancelled'] } },
                },
              },
            },
          },
          responses: { 200: { description: 'อัปเดตสำเร็จ' } },
        },
      },
      '/orders/{id}/pay': {
        post: {
          tags: ['Orders'],
          summary: 'ชำระเงินออเดอร์',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['paymentMethod'],
                  properties: {
                    paymentMethod: { type: 'string', enum: ['Cash', 'Transfer', 'Credit'] },
                    discount: { type: 'number', default: 0 },
                  },
                },
              },
            },
          },
          responses: { 200: { description: 'ชำระสำเร็จ' } },
        },
      },
      '/orders/{id}/items': {
        post: {
          tags: ['Orders'],
          summary: 'เพิ่มรายการสินค้าในออเดอร์',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    productId: { type: 'string', format: 'uuid' },
                    customLabel: { type: 'string' },
                    technicianName: { type: 'string' },
                    quantity: { type: 'integer', minimum: 1 },
                    unitPrice: { type: 'number', minimum: 0 },
                  },
                },
              },
            },
          },
          responses: { 201: { description: 'เพิ่มสำเร็จ' } },
        },
      },
      '/orders/{id}/items/{itemId}': {
        delete: {
          tags: ['Orders'],
          summary: 'ลบรายการในออเดอร์',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
            { name: 'itemId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: { 204: { description: 'ลบสำเร็จ' } },
        },
      },
      // ── Reports ────────────────────────────────────────────────────────────
      '/reports/summary': {
        get: {
          tags: ['Reports'],
          summary: 'สรุปยอดขาย',
          parameters: [
            { name: 'days', in: 'query', schema: { type: 'integer', default: 30, minimum: 7, maximum: 90 }, description: 'จำนวนวันย้อนหลัง (daily chart)' },
            { name: 'months', in: 'query', schema: { type: 'integer', default: 12, minimum: 3, maximum: 36 }, description: 'จำนวนเดือนย้อนหลัง (monthly chart)' },
          ],
          responses: {
            200: {
              description: 'ข้อมูลสรุป',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      today: { type: 'object', properties: { revenue: { type: 'number' }, orders: { type: 'integer' } } },
                      thisMonth: { type: 'object', properties: { revenue: { type: 'number' }, orders: { type: 'integer' } } },
                      thisYear: { type: 'object', properties: { revenue: { type: 'number' }, orders: { type: 'integer' } } },
                      allTime: { type: 'object', properties: { revenue: { type: 'number' }, orders: { type: 'integer' } } },
                      daily: { type: 'array', items: { type: 'object', properties: { date: { type: 'string' }, revenue: { type: 'number' }, orders: { type: 'integer' } } } },
                      monthly: { type: 'array', items: { type: 'object', properties: { month: { type: 'string' }, revenue: { type: 'number' }, orders: { type: 'integer' } } } },
                      byCategory: { type: 'array', items: { type: 'object', properties: { category: { type: 'string' }, revenue: { type: 'number' }, orders: { type: 'integer' } } } },
                    },
                  },
                },
              },
            },
          },
        },
      },
      // ── Hardware ───────────────────────────────────────────────────────────
      '/hardware/print': {
        post: {
          tags: ['Hardware'],
          summary: 'สั่งพิมพ์ใบเสร็จ',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['order_number', 'customer_name', 'license_plate', 'items', 'total'],
                  properties: {
                    order_number: { type: 'string' },
                    customer_name: { type: 'string' },
                    license_plate: { type: 'string' },
                    items: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          name: { type: 'string' },
                          qty: { type: 'integer' },
                          price: { type: 'number' },
                        },
                      },
                    },
                    total: { type: 'number' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'พิมพ์สำเร็จ' },
            503: { description: 'เครื่องพิมพ์ไม่พร้อม' },
          },
        },
      },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJSDoc(options);
