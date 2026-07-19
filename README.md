# Manufacturing ERP System

A comprehensive, production-grade Enterprise Resource Planning (ERP) system built specifically for electrical fireplace manufacturing. This system manages the complete order lifecycle from quotation to delivery, with real-time production tracking, quality control, inventory management, and executive dashboards.

## 🚀 Features

### Core Order Flow (Phase 1 - Implemented)
- ✅ **Sales Order Entry** - Complete order capture with customer details, product configuration, dimensions, and pricing
- ✅ **Production Kanban Board** - Real-time 20-stage production tracking with drag-and-drop interface
- ✅ **Quality Control** - QC inspections with automated NCR (Non-Conformance Report) generation
- ✅ **CEO Dashboard** - Live KPIs and business metrics
- ✅ **Role-Based Access Control** - Secure authentication with JWT and role-based permissions
- ✅ **Inventory Management** - Component tracking with suppliers and stock levels
- ✅ **Customer Management** - Complete customer database with order history

### Technology Stack

**Backend:**
- Next.js 15 App Router (API Routes)
- PostgreSQL 15 (Production database)
- Prisma ORM (Type-safe database access)
- JWT Authentication with refresh tokens
- bcrypt (Password hashing)

**Frontend:**
- React 18.3 with Next.js 15
- Tailwind CSS 3.4
- shadcn/ui components
- Lucide icons
- Sonner (Toast notifications)
- Modern glassmorphism design

**Database:**
- PostgreSQL 15
- 15+ normalized tables
- Full referential integrity
- Audit logging
- Soft deletes

## 🏗️ System Architecture

### Database Schema

The system uses a comprehensive PostgreSQL schema with the following core entities:

1. **User Management**
   - Users with 11 roles (CEO, Sales, Design, Production, Inventory, Procurement, QC, Electronics, Dispatch, Service, Admin)
   - Role-based permissions
   - 2FA support

2. **Order Management**
   - Orders with complete lifecycle tracking
   - Products (4 fireplace variants: E.F., E.F.P., E.F.H., E.F.H.P.)
   - Customers with full contact information

3. **Production**
   - 20 production stages per order
   - Stage status tracking (Pending, In Progress, Completed, On Hold, Failed)
   - Operator assignment and timestamps

4. **Inventory**
   - Components (14 categories including FRP logs, LED modules, ESP32, etc.)
   - Suppliers with ratings
   - Inventory transactions with lot tracking

5. **Quality Control**
   - QC inspections (Incoming, In-Process, Final)
   - NCR management with severity levels
   - Automated defect tracking

6. **Audit & Traceability**
   - Serial numbers with complete manufacturing history
   - Audit logs for all system actions
   - Document management

### API Endpoints

#### Authentication
- `POST /api/auth/login` - User login with optional 2FA
- `POST /api/auth/register` - User registration (admin only)
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/verify` - Verify current token

#### Orders
- `GET /api/orders` - Get all orders (with filters)
- `GET /api/orders/:id` - Get single order with full details
- `POST /api/orders` - Create new order
- `PUT /api/orders/:id` - Update order
- `GET /api/orders/:id/stages` - Get production stages for order

#### Production
- `GET /api/production/kanban` - Get Kanban board data
- `PUT /api/production/stages/:id` - Update production stage status

#### Quality Control
- `GET /api/qc/inspections` - Get QC inspections
- `POST /api/qc/inspections` - Create QC inspection

#### Inventory & Suppliers
- `GET /api/components` - Get all inventory components
- `POST /api/components` - Add new component
- `GET /api/suppliers` - Get all suppliers
- `POST /api/suppliers` - Add new supplier

#### Customers
- `GET /api/customers` - Get all customers
- `POST /api/customers` - Add new customer

#### Analytics
- `GET /api/dashboard/stats` - Get dashboard statistics

## 🎯 Production Stages

The system tracks orders through 20 distinct production stages:

1. Design Approved
2. Laser Cutting
3. Bending
4. Welding
5. Grinding/Buffing
6. Powder Coating
7. Incoming QC
8. Wooden Log Preparation
9. Flame Sheet Preparation
10. Light Assembly
11. Stepper Motor Assembly
12. PCB Preparation
13. Speaker Assembly
14. Heater Assembly
15. Main Assembly
16. Functional Testing
17. Burn-in Test
18. Final QC
19. Packaging
20. Dispatch Ready

## 🔐 User Roles & Access

### Demo Credentials (Password: `admin123`)

| Role | Email | Access Level |
|------|-------|--------------|
| CEO | ceo@fireplace.com | Full system access, analytics, KPIs |
| Sales | sales@fireplace.com | Order entry, customer management |
| Design | design@fireplace.com | Design approval, BOM management |
| Production | production@fireplace.com | Kanban board, stage updates |
| QC | qc@fireplace.com | Quality inspections, NCR management |
| Inventory | inventory@fireplace.com | Stock management, components |
| Dispatch | dispatch@fireplace.com | Shipping, delivery tracking |
| Admin | admin@fireplace.com | User management, system config |

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL 15
- Yarn package manager

### Installation

1. **Clone and Install Dependencies**
```bash
cd /app
yarn install
```

2. **Database Setup**
```bash
# PostgreSQL should be running
sudo service postgresql start

# Run migrations
npx prisma migrate dev

# Seed database with demo data
node prisma/seed.js
```

3. **Environment Variables**
Already configured in `/app/.env`:
```
DATABASE_URL="postgresql://erp_user:erp_password_2025@localhost:5432/manufacturing_erp?schema=public"
JWT_SECRET=manufacturing_erp_jwt_secret_2025_secure_key_change_in_production
JWT_REFRESH_SECRET=manufacturing_erp_refresh_token_secret_2025_secure_key
NEXT_PUBLIC_BASE_URL=https://production-hub-375.preview.emergentagent.com
```

4. **Start Application**
```bash
# Development mode
yarn dev

# Or via supervisor (already running)
sudo supervisorctl restart nextjs
```

5. **Access Application**
- **URL:** https://production-hub-375.preview.emergentagent.com
- **Login:** Use any demo credentials above
- **Password:** admin123

## 📊 Key Features Demonstrated

### Sales Dashboard
- Create new orders with complete product configuration
- Track order status in real-time
- View sales statistics and metrics
- Customer management

### Production Kanban Board
- Visual board showing all orders in production
- Real-time stage progress tracking
- Priority-based ordering (Urgent, High, Normal, Low)
- One-click stage completion
- Progress percentage for each order
- Delay and bottleneck visibility

### CEO Dashboard
- Live KPIs (Total Orders, In Production, Delayed, etc.)
- Production efficiency metrics
- Critical alerts system
- System health monitoring
- Low stock alerts

### Quality Control
- QC inspection management
- Pass/Fail tracking with pass rate
- Automated NCR generation on failures
- Inspection history and audit trail

## 🗄️ Database Management

### Prisma Commands
```bash
# Generate Prisma Client
npx prisma generate

# Create new migration
npx prisma migrate dev --name your_migration_name

# Reset database (careful!)
npx prisma migrate reset

# Open Prisma Studio (database GUI)
npx prisma studio
```

### Direct PostgreSQL Access
```bash
# Connect to database
sudo -u postgres psql manufacturing_erp

# Common queries
SELECT * FROM users;
SELECT * FROM orders;
SELECT * FROM production_stages WHERE status = 'IN_PROGRESS';
```

## 🔧 System Architecture Details

### Authentication Flow
1. User submits credentials to `/api/auth/login`
2. Backend validates credentials with bcrypt
3. System generates JWT access token (15 min expiry) and refresh token (7 days)
4. Tokens stored in localStorage
5. Access token included in Authorization header for all API requests
6. Automatic token refresh when access token expires

### Order Lifecycle
1. **Quotation** - Sales creates order with customer requirements
2. **Approved** - Management approves order
3. **Design Approved** - Engineering finalizes drawings and BOM
4. **In Production** - Order moves through 20 manufacturing stages
5. **QC** - Multiple quality checkpoints (Incoming, In-Process, Final)
6. **Dispatch Ready** - Order packaged and ready
7. **Dispatched** - Order shipped to customer
8. **Delivered** - Customer receives order
9. **Installed** - Installation completed (if required)
10. **Closed** - Order completed and archived

### Production Stage Management
- Each order automatically gets 20 production stages on creation
- Stages can be: Pending, In Progress, Completed, On Hold, Failed, Skipped
- Operators can be assigned to stages
- Checklists, photos, and notes can be attached to each stage
- Timestamps track actual start/end times for analysis

## 📈 Future Enhancements (Not Implemented Yet)

### Phase 2 - Advanced Features
- [ ] Real-time WebSocket updates
- [ ] BOM versioning and automatic inventory reservation
- [ ] Advanced analytics with charts (Recharts integration)
- [ ] Gantt chart production planning
- [ ] Document upload (SolidWorks, AutoCAD, BOMs)
- [ ] QR code generation for serial numbers
- [ ] WhatsApp/Email/SMS notifications
- [ ] Barcode scanning for inventory
- [ ] Mobile-responsive improvements
- [ ] Dark/Light theme toggle

### Phase 3 - Enterprise Features
- [ ] Multi-factory support
- [ ] Advanced reporting (PDF generation)
- [ ] Procurement automation
- [ ] Supplier portal
- [ ] Customer portal with order tracking
- [ ] Advanced RBAC with custom permissions
- [ ] Workflow automation
- [ ] Integration APIs (REST/GraphQL)

## 🐛 Known Limitations

1. **File Uploads:** Document upload not yet implemented (planned for Phase 2)
2. **Real-time Updates:** Currently uses periodic refresh; WebSockets planned
3. **Mobile UI:** Optimized for desktop; mobile improvements coming
4. **Reporting:** Basic statistics only; advanced reports in Phase 2
5. **BOM Management:** Basic structure exists but not fully implemented

## 🧪 Testing

### Manual API Testing
```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"sales@fireplace.com","password":"admin123"}'

# Get orders (replace TOKEN)
curl -X GET http://localhost:3000/api/orders \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Create order
curl -X POST http://localhost:3000/api/orders \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"customerId":"...","productId":"...","variant":"EF",...}'
```

### Sample Data
The system comes pre-seeded with:
- 8 users (one for each role)
- 4 fireplace products
- 2 suppliers
- 4 inventory components
- 1 sample customer
- 3 sample orders (created during testing)

## 📝 Development Notes

### Code Organization
```
/app
├── app/
│   ├── api/[[...path]]/route.js    # All API endpoints
│   ├── page.js                     # Login page
│   ├── layout.js                   # Root layout
│   ├── dashboard/
│   │   ├── layout.jsx              # Dashboard layout with nav
│   │   ├── sales/page.jsx          # Sales dashboard
│   │   ├── production/page.jsx     # Kanban board
│   │   ├── ceo/page.jsx            # CEO dashboard
│   │   └── qc/page.jsx             # QC dashboard
│   └── globals.css                 # Global styles
├── components/ui/                  # shadcn components
├── lib/
│   ├── prisma.js                   # Prisma client
│   ├── auth.js                     # Auth utilities
│   ├── api.js                      # API client
│   └── middleware.js               # Auth middleware
├── context/
│   └── AuthContext.jsx             # Auth context provider
├── prisma/
│   ├── schema.prisma               # Database schema
│   ├── seed.js                     # Seed script
│   └── migrations/                 # Migration history
└── README.md                       # This file
```

### Design System
- **Colors:** Slate/Blue/Purple gradient theme
- **Typography:** System font stack
- **Components:** shadcn/ui (Radix UI + Tailwind)
- **Icons:** Lucide React
- **Animations:** Tailwind transitions + CSS animations

## 🆘 Troubleshooting

### Database Issues
```bash
# Check PostgreSQL status
sudo service postgresql status

# Restart PostgreSQL
sudo service postgresql restart

# Check database connection
sudo -u postgres psql -c "SELECT 1"
```

### Application Not Starting
```bash
# Check logs
tail -f /var/log/supervisor/nextjs.out.log

# Restart application
sudo supervisorctl restart nextjs

# Clear Next.js cache
rm -rf /app/.next
```

### Authentication Issues
- Clear browser localStorage
- Check JWT_SECRET in .env
- Verify user exists: `sudo -u postgres psql manufacturing_erp -c "SELECT * FROM users;"`

## 📄 License

Proprietary - Manufacturing ERP System

## 👥 Support

For technical support or questions about the system, please contact the development team.

---

## ✨ Quick Start Guide

1. **Access the system:** https://production-hub-375.preview.emergentagent.com
2. **Login as Sales:** sales@fireplace.com / admin123
3. **Create an order:** Click "New Order" button
4. **Switch to Production:** Login as production@fireplace.com
5. **View Kanban board:** See your order in production
6. **Update stages:** Click "Start" and "Complete" buttons
7. **Check CEO Dashboard:** Login as ceo@fireplace.com to see analytics

**The system is now live and fully operational! 🎉**
