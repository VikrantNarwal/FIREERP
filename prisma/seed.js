const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Hash password
  const hashedPassword = await bcrypt.hash('admin123', 12)

  // Create users for each role
  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'ceo@fireplace.com' },
      update: {},
      create: {
        email: 'ceo@fireplace.com',
        password: hashedPassword,
        firstName: 'John',
        lastName: 'CEO',
        role: 'CEO',
        department: 'Management',
        status: 'ACTIVE'
      }
    }),
    prisma.user.upsert({
      where: { email: 'sales@fireplace.com' },
      update: {},
      create: {
        email: 'sales@fireplace.com',
        password: hashedPassword,
        firstName: 'Sarah',
        lastName: 'Sales',
        role: 'SALES',
        department: 'Sales',
        status: 'ACTIVE'
      }
    }),
    prisma.user.upsert({
      where: { email: 'design@fireplace.com' },
      update: {},
      create: {
        email: 'design@fireplace.com',
        password: hashedPassword,
        firstName: 'David',
        lastName: 'Designer',
        role: 'DESIGN',
        department: 'Design',
        status: 'ACTIVE'
      }
    }),
    prisma.user.upsert({
      where: { email: 'production@fireplace.com' },
      update: {},
      create: {
        email: 'production@fireplace.com',
        password: hashedPassword,
        firstName: 'Mike',
        lastName: 'Production',
        role: 'PRODUCTION',
        department: 'Manufacturing',
        status: 'ACTIVE'
      }
    }),
    prisma.user.upsert({
      where: { email: 'qc@fireplace.com' },
      update: {},
      create: {
        email: 'qc@fireplace.com',
        password: hashedPassword,
        firstName: 'Quality',
        lastName: 'Inspector',
        role: 'QC',
        department: 'Quality Control',
        status: 'ACTIVE'
      }
    }),
    prisma.user.upsert({
      where: { email: 'inventory@fireplace.com' },
      update: {},
      create: {
        email: 'inventory@fireplace.com',
        password: hashedPassword,
        firstName: 'Inventory',
        lastName: 'Manager',
        role: 'INVENTORY',
        department: 'Inventory',
        status: 'ACTIVE'
      }
    }),
    prisma.user.upsert({
      where: { email: 'dispatch@fireplace.com' },
      update: {},
      create: {
        email: 'dispatch@fireplace.com',
        password: hashedPassword,
        firstName: 'Dispatch',
        lastName: 'Manager',
        role: 'DISPATCH',
        department: 'Dispatch',
        status: 'ACTIVE'
      }
    }),
    prisma.user.upsert({
      where: { email: 'admin@fireplace.com' },
      update: {},
      create: {
        email: 'admin@fireplace.com',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN',
        department: 'Administration',
        status: 'ACTIVE'
      }
    })
  ])

  console.log(`✅ Created ${users.length} users`)

  // Create products
  const products = await Promise.all([
    prisma.product.upsert({
      where: { type_variant: { type: 'ELECTRICAL_FIREPLACE', variant: 'EF' } },
      update: {},
      create: {
        name: 'Electric Fireplace Basic',
        type: 'ELECTRICAL_FIREPLACE',
        variant: 'EF',
        description: 'Basic electrical fireplace with standard features',
        basePrice: 25000
      }
    }),
    prisma.product.upsert({
      where: { type_variant: { type: 'ELECTRICAL_FIREPLACE', variant: 'EFP' } },
      update: {},
      create: {
        name: 'Electric Fireplace Premium',
        type: 'ELECTRICAL_FIREPLACE',
        variant: 'EFP',
        description: 'Premium electrical fireplace with enhanced features',
        basePrice: 35000
      }
    }),
    prisma.product.upsert({
      where: { type_variant: { type: 'ELECTRICAL_FIREPLACE', variant: 'EFH' } },
      update: {},
      create: {
        name: 'Electric Fireplace with Heater',
        type: 'ELECTRICAL_FIREPLACE',
        variant: 'EFH',
        description: 'Electrical fireplace with built-in heater',
        basePrice: 32000
      }
    }),
    prisma.product.upsert({
      where: { type_variant: { type: 'ELECTRICAL_FIREPLACE', variant: 'EFHP' } },
      update: {},
      create: {
        name: 'Electric Fireplace Heater Premium',
        type: 'ELECTRICAL_FIREPLACE',
        variant: 'EFHP',
        description: 'Premium electrical fireplace with heater and all features',
        basePrice: 45000
      }
    })
  ])

  console.log(`✅ Created ${products.length} products`)

  // Create some sample suppliers
  const suppliers = await Promise.all([
    prisma.supplier.create({
      data: {
        name: 'ABC Electronics Supplies',
        code: 'SUP001',
        contactPerson: 'Rajesh Kumar',
        email: 'contact@abcelectronics.com',
        phone: '9876543210',
        address: '123 Industrial Area',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        gst: '27ABCDE1234F1Z5',
        rating: 4.5,
        leadTimeDays: 7,
        isPreferred: true,
        isActive: true
      }
    }),
    prisma.supplier.create({
      data: {
        name: 'XYZ Components Ltd',
        code: 'SUP002',
        contactPerson: 'Amit Sharma',
        email: 'sales@xyzcomponents.com',
        phone: '9876543211',
        address: '456 Manufacturing Zone',
        city: 'Pune',
        state: 'Maharashtra',
        pincode: '411001',
        gst: '27XYZAB5678G1Z5',
        rating: 4.2,
        leadTimeDays: 10,
        isPreferred: false,
        isActive: true
      }
    })
  ])

  console.log(`✅ Created ${suppliers.length} suppliers`)

  // Create some sample components
  const components = await Promise.all([
    prisma.component.create({
      data: {
        name: 'FRP Wooden Log',
        code: 'COMP-FRP-001',
        category: 'FRP_LOGS',
        description: 'Fiberglass reinforced plastic log',
        unit: 'pcs',
        currentStock: 150,
        reorderLevel: 50,
        reorderQuantity: 200,
        minStock: 30,
        location: 'Warehouse A1',
        supplierId: suppliers[0].id,
        unitPrice: 150
      }
    }),
    prisma.component.create({
      data: {
        name: 'LED Strip Module 5050',
        code: 'COMP-LED-001',
        category: 'LED_MODULES',
        description: '5050 RGB LED strip module',
        unit: 'meter',
        currentStock: 500,
        reorderLevel: 100,
        reorderQuantity: 500,
        minStock: 50,
        location: 'Warehouse B2',
        supplierId: suppliers[0].id,
        unitPrice: 200
      }
    }),
    prisma.component.create({
      data: {
        name: 'ESP32 Development Board',
        code: 'COMP-ESP32-001',
        category: 'ESP32',
        description: 'ESP32 microcontroller board',
        unit: 'pcs',
        currentStock: 80,
        reorderLevel: 30,
        reorderQuantity: 100,
        minStock: 20,
        location: 'Electronics Store',
        supplierId: suppliers[1].id,
        unitPrice: 350
      }
    }),
    prisma.component.create({
      data: {
        name: 'Stepper Motor NEMA 17',
        code: 'COMP-MOTOR-001',
        category: 'STEPPER_MOTORS',
        description: 'NEMA 17 stepper motor',
        unit: 'pcs',
        currentStock: 45,
        reorderLevel: 20,
        reorderQuantity: 50,
        minStock: 10,
        location: 'Electronics Store',
        supplierId: suppliers[1].id,
        unitPrice: 450
      }
    })
  ])

  console.log(`✅ Created ${components.length} components`)

  // Create a sample customer
  const customer = await prisma.customer.create({
    data: {
      name: 'Raj Interiors',
      company: 'Raj Interiors Pvt Ltd',
      email: 'contact@rajinteriors.com',
      phone: '9876543220',
      address: '789 Commercial Street',
      city: 'Delhi',
      state: 'Delhi',
      pincode: '110001',
      gst: '07RAJIN1234H1Z5'
    }
  })

  console.log(`✅ Created sample customer`)

  console.log('🎉 Database seeded successfully!')
  console.log('\n📝 Test User Credentials:')
  console.log('Email: ceo@fireplace.com | Password: admin123')
  console.log('Email: sales@fireplace.com | Password: admin123')
  console.log('Email: design@fireplace.com | Password: admin123')
  console.log('Email: production@fireplace.com | Password: admin123')
  console.log('Email: qc@fireplace.com | Password: admin123')
  console.log('Email: inventory@fireplace.com | Password: admin123')
  console.log('Email: dispatch@fireplace.com | Password: admin123')
  console.log('Email: admin@fireplace.com | Password: admin123')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
