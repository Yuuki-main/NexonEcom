// Development seed data for NexonEcom.
//
// Run with: npm run db:seed  (see package.json)
//
// Idempotent where practical: every model here is looked up by a natural
// key before being created, so rerunning this script does not create
// duplicates. A few models (Organization.abn, User.email, Category/Brand/
// Product.slug, Warehouse.code) are only *logically* unique via a partial
// SQL index added outside Prisma's schema language (see the manual-SQL
// checklist at the top of prisma/migrations/0001_initial/migration.sql) —
// Prisma has no @unique attribute for them, so idempotency here is done
// with a find-then-create check rather than .upsert(). That leaves a tiny
// race window under concurrent seed runs, which is irrelevant for a
// single-developer dev script.
//
// Deliberately NOT seeded: orders, invoices, payments, credit accounts, or
// any CRM record (contacts/leads/opportunities/quotes) — none of them are
// required for the referential integrity of what IS seeded here, per the
// brief. Addresses are the one exception: Warehouse.addressId is a
// required (non-null) foreign key, so two Address rows are created solely
// to satisfy that — not a general address book seed.

import { config } from 'dotenv'
config()
config({ path: '.env.local', override: true })

import bcrypt from 'bcryptjs'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../lib/generated/prisma/client.ts'

// Seeding runs through the pooled connection (DATABASE_URL) — this is
// ordinary application-shaped read/write traffic, not a schema migration,
// so it does not need the direct/unpooled connection reserved for Migrate.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

const DEV_PASSWORD = 'DevPassword123!'

async function findOrCreate(delegate, where, data) {
  const existing = await delegate.findFirst({ where })
  if (existing) return existing
  return delegate.create({ data })
}

async function seedCountries() {
  const countries = [
    { isoCode: 'AU', name: 'Australia', callingCode: '+61' },
    { isoCode: 'NZ', name: 'New Zealand', callingCode: '+64' },
    { isoCode: 'US', name: 'United States', callingCode: '+1' },
    { isoCode: 'GB', name: 'United Kingdom', callingCode: '+44' },
    { isoCode: 'CN', name: 'China', callingCode: '+86' },
  ]

  for (const country of countries) {
    await prisma.country.upsert({
      where: { isoCode: country.isoCode },
      update: {},
      create: country,
    })
  }

  console.log(`  countries: ${countries.length}`)
  return countries.length
}

async function seedRoles() {
  const roles = [
    {
      key: 'admin',
      name: 'Administrator',
      description: 'Full platform access',
    },
    {
      key: 'sales_rep',
      name: 'Sales Representative',
      description: 'Manages customer accounts and the sales pipeline',
    },
    {
      key: 'credit_manager',
      name: 'Credit Manager',
      description: 'Manages customer credit accounts and terms',
    },
    {
      key: 'warehouse_staff',
      name: 'Warehouse Staff',
      description: 'Manages inventory and stock movements',
    },
    {
      key: 'support',
      name: 'Support Agent',
      description: 'Customer support and account assistance',
    },
  ]

  const created = {}
  for (const role of roles) {
    created[role.key] = await prisma.role.upsert({
      where: { key: role.key },
      update: {},
      create: role,
    })
  }

  console.log(`  roles: ${roles.length}`)
  return created
}

async function seedOrganizations() {
  // accountOwnerUserId is intentionally left unset here — Users are seeded
  // after Organizations (per the requested dependency order), so account
  // ownership is assigned in a short patch pass at the end of seedUsers().
  // The column is nullable specifically to make this ordering possible.
  const orgs = [
    {
      legalName: 'Solaris Electrical Pty Ltd',
      tradingName: 'Solaris Electrical',
      abn: '51824753556',
      isGstRegistered: true,
    },
    {
      legalName: 'BrightPath Solar Installations Pty Ltd',
      tradingName: 'BrightPath Solar',
      abn: '74615932481',
      isGstRegistered: true,
    },
    {
      legalName: 'GreenGrid Energy Solutions Pty Ltd',
      tradingName: 'GreenGrid Energy',
      abn: '33198447210',
      isGstRegistered: true,
    },
    {
      legalName: 'SunTech Installations Group Pty Ltd',
      tradingName: 'SunTech Installations',
      abn: '82356719044',
      isGstRegistered: true,
    },
  ]

  const created = []
  for (const org of orgs) {
    created.push(
      await findOrCreate(
        prisma.organization,
        { legalName: org.legalName },
        org,
      ),
    )
  }

  console.log(`  organizations: ${created.length}`)
  return created
}

async function seedUsers(organizations) {
  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 12)

  const staff = [
    {
      fullName: 'Sarah Mitchell',
      email: 'admin@nexonecom.com.au',
      roleKey: 'admin',
    },
    {
      fullName: 'David Chen',
      email: 'david.chen@nexonecom.com.au',
      roleKey: 'sales_rep',
    },
    {
      fullName: 'Priya Nair',
      email: 'priya.nair@nexonecom.com.au',
      roleKey: 'sales_rep',
    },
    {
      fullName: 'Marcus Webb',
      email: 'marcus.webb@nexonecom.com.au',
      roleKey: 'credit_manager',
    },
    {
      fullName: "Liam O'Connor",
      email: 'liam.oconnor@nexonecom.com.au',
      roleKey: 'warehouse_staff',
    },
  ]

  const [solaris, brightpath, greengrid, suntech] = organizations

  const customerUsers = [
    {
      fullName: 'James Anderson',
      email: 'james@solariselectrical.com.au',
      org: solaris,
      orgRole: 'owner',
    },
    {
      fullName: 'Emma Thompson',
      email: 'emma@solariselectrical.com.au',
      org: solaris,
      orgRole: 'purchaser',
    },
    {
      fullName: 'Michael Torres',
      email: 'michael@brightpathsolar.com.au',
      org: brightpath,
      orgRole: 'owner',
    },
    {
      fullName: 'Olivia Bennett',
      email: 'olivia@greengridenergy.com.au',
      org: greengrid,
      orgRole: 'owner',
    },
    {
      fullName: 'Noah Fitzgerald',
      email: 'noah@greengridenergy.com.au',
      org: greengrid,
      orgRole: 'purchaser',
    },
    {
      fullName: 'Ava Richardson',
      email: 'ava@suntechinstallations.com.au',
      org: suntech,
      orgRole: 'owner',
    },
  ]

  const staffUsers = {}
  for (const person of staff) {
    staffUsers[person.roleKey] = staffUsers[person.roleKey] || []
    const user = await findOrCreate(
      prisma.user,
      { email: person.email },
      {
        fullName: person.fullName,
        email: person.email,
        passwordHash,
        isEmailVerified: true,
        isActive: true,
      },
    )
    staffUsers[person.roleKey].push({ user, ...person })
  }

  const createdCustomerUsers = []
  for (const person of customerUsers) {
    const user = await findOrCreate(
      prisma.user,
      { email: person.email },
      {
        fullName: person.fullName,
        email: person.email,
        passwordHash,
        isEmailVerified: true,
        isActive: true,
      },
    )
    createdCustomerUsers.push({ user, ...person })
  }

  console.log(
    `  users: ${staff.length + customerUsers.length} (${staff.length} staff, ${customerUsers.length} customer portal)`,
  )

  return { staffUsers, customerUsers: createdCustomerUsers }
}

async function seedUserRoles(rolesByKey, staffUsers) {
  let count = 0
  for (const roleKey of Object.keys(staffUsers)) {
    const role = rolesByKey[roleKey]
    for (const { user } of staffUsers[roleKey]) {
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId: role.id } },
        update: {},
        create: { userId: user.id, roleId: role.id },
      })
      count++
    }
  }
  console.log(`  user role assignments: ${count}`)
}

async function assignAccountOwners(organizations, staffUsers) {
  const [solaris, brightpath, greengrid, suntech] = organizations
  const [davidChen, priyaNair] = staffUsers.sales_rep.map((s) => s.user)

  const assignments = [
    [solaris, davidChen],
    [brightpath, priyaNair],
    [greengrid, davidChen],
    [suntech, priyaNair],
  ]

  for (const [org, owner] of assignments) {
    await prisma.organization.update({
      where: { id: org.id },
      data: { accountOwnerUserId: owner.id },
    })
  }
  console.log(
    `  organizations assigned an account owner: ${assignments.length}`,
  )
}

async function seedOrganizationMembers(customerUsers) {
  let count = 0
  for (const { user, org, orgRole } of customerUsers) {
    const existing = await prisma.organizationMember.findFirst({
      where: { organizationId: org.id, userId: user.id },
    })
    if (!existing) {
      await prisma.organizationMember.create({
        data: {
          organizationId: org.id,
          userId: user.id,
          role: orgRole,
          status: 'active',
          joinedAt: new Date(),
        },
      })
      count++
    }
  }
  console.log(`  organization members: ${count}`)
}

async function seedCategories() {
  const categories = [
    {
      name: 'Solar Panels',
      slug: 'solar-panels',
      description:
        "High-efficiency solar panels from the world's leading manufacturers",
      imageUrl:
        'https://images.unsplash.com/photo-1509391366360-2e959784a276?q=80&w=800',
      displayOrder: 1,
    },
    {
      name: 'Inverters',
      slug: 'inverters',
      description:
        'Reliable string, hybrid and micro inverters for every installation',
      imageUrl:
        'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=800',
      displayOrder: 2,
    },
    {
      name: 'Battery Storage',
      slug: 'battery-storage',
      description: 'Store excess solar energy with intelligent battery systems',
      imageUrl:
        'https://images.unsplash.com/photo-1611365892117-00ac5ef43c90?q=80&w=800',
      displayOrder: 3,
    },
    {
      name: 'Mounting Systems',
      slug: 'mounting-systems',
      description: 'Durable roof, ground and carport mounting solutions',
      imageUrl:
        'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?q=80&w=800',
      displayOrder: 4,
    },
  ]

  const created = {}
  for (const category of categories) {
    created[category.slug] = await findOrCreate(
      prisma.category,
      { slug: category.slug },
      category,
    )
  }

  console.log(`  categories: ${categories.length}`)
  return created
}

async function seedBrands() {
  const brands = [
    {
      name: 'Jinko Solar',
      slug: 'jinko-solar',
      logoUrl: '/brands/Jinko_Solar_logo.jpeg',
      website: 'https://www.jinkosolar.com',
    },
    {
      name: 'LONGi',
      slug: 'longi',
      logoUrl: '/brands/Longi_logo.jpeg',
      website: 'https://www.longi.com',
    },
    {
      name: 'Trina Solar',
      slug: 'trina-solar',
      logoUrl: '/brands/Trina_Solar_logo.jpeg',
      website: 'https://www.trinasolar.com',
    },
    {
      name: 'Canadian Solar',
      slug: 'canadian-solar',
      logoUrl: '/brands/Canadian_Solar_logo.jpeg',
      website: 'https://www.canadiansolar.com',
    },
    {
      name: 'Sungrow',
      slug: 'sungrow',
      logoUrl: '/brands/Sungrow_logo.jpeg',
      website: 'https://www.sungrowpower.com',
    },
    {
      name: 'FoxESS',
      slug: 'foxess',
      logoUrl: '/brands/FoxESS_logo.jpeg',
      website: 'https://www.fox-ess.com',
    },
    {
      name: 'Growatt',
      slug: 'growatt',
      logoUrl: '/brands/Growatt_logo.jpeg',
      website: 'https://www.growatt.com',
    },
    {
      name: 'Tindo Solar',
      slug: 'tindo-solar',
      logoUrl: '/brands/Tindo_Solar_logo.jpeg',
      website: 'https://www.tindosolar.com.au',
    },
    {
      name: 'Risen Energy',
      slug: 'risen-energy',
      logoUrl: '/brands/Risen_Energy_logo.jpeg',
      website: 'https://www.risenenergy.com',
    },
    {
      name: 'JA Solar',
      slug: 'ja-solar',
      logoUrl: '/brands/JA_Solar_logo.jpeg',
      website: 'https://www.jasolar.com',
    },
    { name: 'AE Solar', slug: 'ae-solar', logoUrl: '/brands/AESOLAR_logo.png', website: 'https://www.ae-solar.com' },
    { name: 'Eging PV', slug: 'eging-pv', logoUrl: '/brands/EGING_logo.png', website: 'https://www.egingpv.com' },
    { name: 'Suntech', slug: 'suntech', logoUrl: '/brands/suntech_logo.png', website: 'https://www.suntech-power.com' },
    { name: 'AlphaESS', slug: 'alphaess', logoUrl: '/brands/AlphaESS_logo.png', website: 'https://www.alphaess.com' },
    { name: 'Anker Solix', slug: 'anker-solix', logoUrl: '/brands/Anker_logo.jpeg', website: 'https://www.anker.com' },
    { name: 'Dyness', slug: 'dyness', logoUrl: '/brands/Dyness_logo.png', website: 'https://www.dyness.com' },
    { name: 'GoodWe', slug: 'goodwe', logoUrl: '/brands/GoodWe_logo.png', website: 'https://www.goodwe.com' },
    { name: 'SAJ', slug: 'saj', logoUrl: '/brands/Saj_logo.png', website: 'https://www.saj-electric.com' },
    { name: 'SolarEdge', slug: 'solaredge', logoUrl: '/brands/Solar_edge_logo.png', website: 'https://www.solaredge.com' },
    { name: 'Solis', slug: 'solis', logoUrl: '/brands/Solis_logo.jpeg', website: 'https://www.solisinverters.com' },
    { name: 'Solplanet', slug: 'solplanet', logoUrl: '/brands/Solplanet_logo.png', website: 'https://www.solplanet.net' },
    { name: 'GE', slug: 'ge', logoUrl: '/brands/GE_logo.png', website: 'https://www.ge.com' },
    { name: 'Fronius', slug: 'fronius', logoUrl: '/brands/Fronius_logo.png', website: 'https://www.fronius.com' },
    { name: 'KSTAR', slug: 'kstar', logoUrl: '/brands/Kstar_logo.png', website: 'https://www.kstar.com' },
    { name: 'LG Energy Solution', slug: 'lg-energy-solution', logoUrl: '/brands/LG_energy_logo.jpg', website: 'https://www.lgensol.com' },
    { name: 'Antai', slug: 'antai', logoUrl: '/brands/AntAi_logo.jpg', website: 'https://www.antaisolar.com' },
    { name: 'Titan Solar', slug: 'titan-solar', logoUrl: '/brands/Titan_solar_logo.png', website: 'https://www.titansolar.com' },
    { name: 'Emerald', slug: 'emerald', logoUrl: '/brands/Emarald_logo.png', website: 'https://www.emerald-ems.com' },
    { name: 'ASE Technology', slug: 'ase-technology', logoUrl: '/brands/ASE_Technology_logo.png', website: 'https://www.aseglobal.com' },
    { name: 'NHP', slug: 'nhp', logoUrl: '/brands/NHP_logo.png', website: 'https://www.nhp.com.au' },
    { name: 'Greenbox', slug: 'greenbox', logoUrl: '/brands/GreenBox_logo.png', website: 'https://www.greenbox.com.au' },
    { name: 'Tigo', slug: 'tigo', logoUrl: '/brands/Tigo_logo.png', website: 'https://www.tigoenergy.com' },
    { name: 'ZBENY', slug: 'zbeny', logoUrl: '/brands/Zbeny_logo.png', website: 'https://www.zbeny.com' },
    { name: 'TMAC', slug: 'tmac', logoUrl: '/brands/Tmac_logo.png', website: 'https://www.tmac.com.au' },
  ]

  const created = {}
  for (const brand of brands) {
    created[brand.slug] = await findOrCreate(
      prisma.brand,
      { slug: brand.slug },
      brand,
    )
  }

  console.log(`  brands: ${brands.length}`)
  return created
}

async function seedProducts(categories, brands) {
  const panels = categories['solar-panels']
  const inverters = categories['inverters']
  const batteries = categories['battery-storage']
  const mounting = categories['mounting-systems']

  const products = [
    // Solar panels
    {
      name: 'Tindo 475W BLACK, N-TYPE TOPCon, 3.2mm Double ARC Glass, 120HC, 35mm, Staubli MC4 EVO2',
      slug: 'tindo-475w-topcon-black',
      sku: 'TDO-Walara-475G4P-BL/35/21',
      description:
        'Australian-made Tindo 475W N-TYPE TOPCon panel with premium double ARC anti-reflective glass and Staubli connectors.',
      price: 210,
      stockQuantity: 120,
      wattage: 475,
      cellType: 'n_type',
      technology: 'TOPCon',
      frameColor: 'Black',
      cellNumber: '120 half-cell',
      manufacturer: 'Tindo Solar',
      efficiency: 22.1,
      warranty: '25 Years',
      categoryId: panels.id,
      brandId: brands['tindo-solar'].id,
      isFeatured: true,
      imageUrl:
        'https://images.unsplash.com/photo-1509391366360-2e959784a276?q=80&w=800',
    },
    {
      name: 'Jinko Tiger Neo 510W N-TYPE TOPCon mono 120half-cells Black Frame 30mm MC4-EVO2',
      slug: 'jinko-tiger-neo-510w-topcon-black',
      sku: 'JNK-JKM510N-60HL4-V/30/21',
      description:
        'Jinko Tiger Neo 510W N-TYPE TOPCon with 120 half-cells and industry-leading 22.65% efficiency.',
      price: 225,
      stockQuantity: 180,
      wattage: 510,
      cellType: 'n_type',
      technology: 'TOPCon',
      frameColor: 'Black',
      cellNumber: '120 half-cell',
      manufacturer: 'Jinko Solar',
      efficiency: 22.65,
      warranty: '30 Years',
      categoryId: panels.id,
      brandId: brands['jinko-solar'].id,
      isFeatured: true,
      imageUrl:
        'https://images.unsplash.com/photo-1548613053-22087dd8edb8?q=80&w=800',
    },
    {
      name: 'JA Solar 545W N-TYPE TOPCon Bifacial Double Glass Silver Frame 132 cells 30mm MC4',
      slug: 'ja-solar-545w-topcon-silver',
      sku: 'JAS-JAM66D40-545/MB/30/21',
      description:
        'JA Solar 545W large-format N-TYPE TOPCon bifacial with silver frame for C&I ground-mounted systems.',
      price: 228,
      stockQuantity: 80,
      wattage: 545,
      cellType: 'n_type',
      technology: 'TOPCon',
      frameColor: 'Silver',
      cellNumber: '132 half-cell',
      manufacturer: 'JA Solar',
      efficiency: 21.8,
      warranty: '30 Years',
      categoryId: panels.id,
      brandId: brands['ja-solar'].id,
      isFeatured: false,
      imageUrl:
        'https://images.unsplash.com/photo-1466611653911-95081537e5b7?q=80&w=800',
    },
    {
      name: 'Canadian Solar TOPHiKu6 575W N-Type TOPCon Bifacial Silver Frame 30mm MC4-EVO2',
      slug: 'canadian-solar-575w-topcon-silver',
      sku: 'CAN-CS6.2-66TB-575/30/21',
      description:
        'Canadian Solar TOPHiKu6 575W TOPCon bifacial silver frame module with 30-year product and performance warranty.',
      price: 245,
      stockQuantity: 100,
      wattage: 575,
      cellType: 'n_type',
      technology: 'TOPCon',
      frameColor: 'Silver',
      cellNumber: '144 half-cell',
      manufacturer: 'Canadian Solar',
      efficiency: 21.8,
      warranty: '30 Years',
      categoryId: panels.id,
      brandId: brands['canadian-solar'].id,
      isFeatured: true,
      imageUrl:
        'https://images.unsplash.com/photo-1497440001374-f26997328c1b?q=80&w=800',
    },
    {
      name: 'JA Solar 380W Mono PERC Half-cell Black Frame 120 cells 30mm MC4',
      slug: 'ja-solar-380w-mono-black',
      sku: 'JAS-JAM60S20-380/MR/30/21',
      description:
        'JA Solar 380W Mono PERC half-cell module with black frame for cost-effective residential and small commercial systems.',
      price: 148,
      stockQuantity: 300,
      wattage: 380,
      cellType: 'p_type',
      technology: 'Mono',
      frameColor: 'Black',
      cellNumber: '120 half-cell',
      manufacturer: 'JA Solar',
      efficiency: 19.9,
      warranty: '25 Years',
      categoryId: panels.id,
      brandId: brands['ja-solar'].id,
      isFeatured: false,
      imageUrl:
        'https://images.unsplash.com/photo-1544027993-37dbfe43562a?q=80&w=800',
    },
    {
      name: 'LONGi Hi-MO X6 580W N-Type HPBC Bifacial Silver Frame 132 cells 30mm MC4-EVO2',
      slug: 'longi-hi-mo-x6-580w-hpbc-silver',
      sku: 'LNG-LR5-72HTH-580HX/SL/30/21',
      description:
        'LONGi Hi-MO X6 580W with revolutionary HPBC cell technology delivering 22.8% module efficiency and 30-year linear warranty.',
      price: 265,
      stockQuantity: 60,
      wattage: 580,
      cellType: 'n_type',
      technology: 'HPBC',
      frameColor: 'Silver',
      cellNumber: '144 half-cell',
      manufacturer: 'LONGi',
      efficiency: 22.8,
      warranty: '30 Years',
      categoryId: panels.id,
      brandId: brands['longi'].id,
      isFeatured: true,
      imageUrl:
        'https://images.unsplash.com/photo-1509391366360-2e959784a276?q=80&w=800',
    },

    // Inverters
    {
      name: 'Sungrow SH10RT Hybrid Inverter 10kW Single Phase with Backup',
      slug: 'sungrow-sh10rt-hybrid',
      sku: 'SH10RT',
      description:
        'Sungrow SH10RT 10kW single-phase hybrid inverter with backup capability, battery ready and integrated smart monitoring.',
      price: 2890,
      stockQuantity: 45,
      wattage: 10000,
      cellType: null,
      technology: 'Hybrid',
      frameColor: null,
      manufacturer: 'Sungrow',
      efficiency: 97.8,
      warranty: '10 Years',
      categoryId: inverters.id,
      brandId: brands['sungrow'].id,
      isFeatured: true,
      imageUrl:
        'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=800',
    },
    {
      name: 'Sungrow SG50CX Commercial String Inverter 50kW Three Phase',
      slug: 'sungrow-sg50cx',
      sku: 'SG50CX',
      description:
        'Sungrow SG50CX 50kW three-phase string inverter designed for commercial and large residential applications.',
      price: 4200,
      stockQuantity: 20,
      wattage: 50000,
      cellType: null,
      technology: 'String',
      frameColor: null,
      manufacturer: 'Sungrow',
      efficiency: 98.6,
      warranty: '5 Years',
      categoryId: inverters.id,
      brandId: brands['sungrow'].id,
      isFeatured: false,
      imageUrl:
        'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=800',
    },
    {
      name: 'FoxESS H3 Hybrid Inverter 10kW Three Phase with EPS Backup',
      slug: 'foxess-h3-hybrid',
      sku: 'H3-10.0-E',
      description:
        'FoxESS H3 10kW three-phase hybrid inverter with 97.8% efficiency, EPS backup and seamless battery integration.',
      price: 3100,
      stockQuantity: 35,
      wattage: 10000,
      cellType: null,
      technology: 'Hybrid',
      frameColor: null,
      manufacturer: 'FoxESS',
      efficiency: 97.8,
      warranty: '10 Years',
      categoryId: inverters.id,
      brandId: brands['foxess'].id,
      isFeatured: false,
      imageUrl:
        'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?q=80&w=800',
    },
    {
      name: 'Growatt MOD 10KTL3-X Three Phase String Inverter 10kW',
      slug: 'growatt-mod-10ktl3-x',
      sku: 'MOD 10KTL3-X',
      description:
        'Growatt MOD 10KTL3-X 10kW three-phase inverter with OLED display, AFCI protection and 98.4% max efficiency.',
      price: 1950,
      stockQuantity: 60,
      wattage: 10000,
      cellType: null,
      technology: 'String',
      frameColor: null,
      manufacturer: 'Growatt',
      efficiency: 98.4,
      warranty: '10 Years',
      categoryId: inverters.id,
      brandId: brands['growatt'].id,
      isFeatured: false,
      imageUrl:
        'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?q=80&w=800',
    },

    // Battery storage
    {
      name: 'FoxESS ECS2900 2.9kWh High Voltage LiFePO4 Battery Module',
      slug: 'foxess-ecs2900',
      sku: 'ECS2900',
      description:
        'FoxESS ECS2900 2.9kWh high-voltage LiFePO4 battery module with modular stacking up to 20.3kWh per system.',
      price: 1450,
      stockQuantity: 80,
      wattage: null,
      cellType: null,
      technology: 'LiFePO4',
      frameColor: null,
      manufacturer: 'FoxESS',
      efficiency: 95.0,
      warranty: '10 Years',
      categoryId: batteries.id,
      brandId: brands['foxess'].id,
      isFeatured: true,
      imageUrl:
        'https://images.unsplash.com/photo-1611365892117-00ac5ef43c90?q=80&w=800',
    },
    {
      name: 'Sungrow SBR096 9.6kWh High Voltage LFP Battery Stackable',
      slug: 'sungrow-sbr096',
      sku: 'SBR096',
      description:
        'Sungrow SBR096 9.6kWh high-voltage LFP battery, stackable up to 4 units for 38.4kWh total capacity.',
      price: 4200,
      stockQuantity: 30,
      wattage: null,
      cellType: null,
      technology: 'LiFePO4',
      frameColor: null,
      manufacturer: 'Sungrow',
      efficiency: 94.5,
      warranty: '10 Years',
      categoryId: batteries.id,
      brandId: brands['sungrow'].id,
      isFeatured: false,
      imageUrl:
        'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?q=80&w=800',
    },
    {
      name: 'Growatt ARK HV 2.5kWh Cobalt-Free LiFePO4 Battery Module',
      slug: 'growatt-ark-hv',
      sku: 'ARK 2.5H-A1',
      description:
        'Growatt ARK HV 2.5kWh high-voltage battery module with cobalt-free LiFePO4 cells, scalable from 7.5kWh to 25.6kWh.',
      price: 1250,
      stockQuantity: 55,
      wattage: null,
      cellType: null,
      technology: 'LiFePO4',
      frameColor: null,
      manufacturer: 'Growatt',
      efficiency: 95.0,
      warranty: '10 Years',
      categoryId: batteries.id,
      brandId: brands['growatt'].id,
      isFeatured: false,
      imageUrl:
        'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?q=80&w=800',
    },

    // Mounting systems
    {
      name: 'Premium Roof Mount Kit — Residential (Tile and Metal)',
      slug: 'roof-mount-kit-residential',
      sku: 'RMK-RES-01',
      description:
        'Complete roof mounting kit for residential installations. Includes rails, clamps, L-feet and stainless steel fasteners.',
      price: 850,
      stockQuantity: 100,
      wattage: null,
      cellType: null,
      technology: null,
      frameColor: null,
      manufacturer: 'NexonEcom',
      efficiency: null,
      warranty: '15 Years',
      categoryId: mounting.id,
      brandId: null,
      isFeatured: false,
      imageUrl:
        'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?q=80&w=800',
    },
    {
      name: 'Ground Mount Structure — Commercial Heavy Duty Galvanized',
      slug: 'ground-mount-structure-commercial',
      sku: 'GMS-COM-02',
      description:
        'Heavy-duty ground mount structure for commercial and utility-scale solar farms. Hot-dip galvanized steel, wind-rated to 180km/h.',
      price: 3200,
      stockQuantity: 25,
      wattage: null,
      cellType: null,
      technology: null,
      frameColor: null,
      manufacturer: 'NexonEcom',
      efficiency: null,
      warranty: '20 Years',
      categoryId: mounting.id,
      brandId: null,
      isFeatured: false,
      imageUrl:
        'https://images.unsplash.com/photo-1605980776566-0486c3ac7617?q=80&w=800',
    },
    {
      name: 'Solar Carport Kit — Double Bay Pre-Engineered Steel Frame',
      slug: 'solar-carport-kit-double',
      sku: 'SCK-DBL-03',
      description:
        'Innovative double-bay solar carport combining vehicle protection with clean energy generation. Quick-assembly pre-engineered steel frame.',
      price: 5800,
      stockQuantity: 10,
      wattage: null,
      cellType: null,
      technology: null,
      frameColor: null,
      manufacturer: 'NexonEcom',
      efficiency: null,
      warranty: '20 Years',
      categoryId: mounting.id,
      brandId: null,
      isFeatured: false,
      imageUrl:
        'https://images.unsplash.com/photo-1624397640148-949b1732bb0a?q=80&w=800',
    },
  ]

  const created = []
  for (const product of products) {
    const { imageUrl, ...productData } = product
    const row = await findOrCreate(
      prisma.product,
      { slug: product.slug },
      productData,
    )
    created.push({ ...row, seedImageUrl: imageUrl })
  }

  console.log(`  products: ${created.length}`)
  return created
}

async function seedProductImages(products) {
  let count = 0
  for (const product of products) {
    const existingImage = await prisma.productImage.findFirst({
      where: { productId: product.id },
    })
    if (!existingImage) {
      await prisma.productImage.create({
        data: {
          productId: product.id,
          url: product.seedImageUrl,
          altText: product.name,
          displayOrder: 0,
        },
      })
      count++
    }
  }
  console.log(`  product images: ${count}`)
}

async function seedWarehouses() {
  const warehouses = [
    {
      code: 'SYD-DC-01',
      name: 'Sydney Distribution Centre',
      address: {
        line1: '45 Huntingwood Drive',
        city: 'Huntingwood',
        state: 'NSW',
        postcode: '2148',
        countryCode: 'AU',
      },
    },
    {
      code: 'MEL-DC-01',
      name: 'Melbourne Distribution Centre',
      address: {
        line1: '12 Doriemus Drive',
        city: 'Derrimut',
        state: 'VIC',
        postcode: '3026',
        countryCode: 'AU',
      },
    },
  ]

  const created = []
  for (const wh of warehouses) {
    let warehouse = await prisma.warehouse.findFirst({
      where: { code: wh.code },
    })
    if (!warehouse) {
      const address = await prisma.address.create({ data: wh.address })
      warehouse = await prisma.warehouse.create({
        data: { code: wh.code, name: wh.name, addressId: address.id },
      })
    }
    created.push(warehouse)
  }

  console.log(`  warehouses: ${created.length}`)
  return created
}

async function seedStock(products, warehouses) {
  const [primary, secondary] = warehouses
  let count = 0

  for (const product of products) {
    const primaryQty = Math.round(product.stockQuantity * 0.7)
    const secondaryQty = product.stockQuantity - primaryQty
    const reorderPoint = Math.max(10, Math.round(product.stockQuantity * 0.1))

    await prisma.stockItem.upsert({
      where: {
        warehouseId_productId: {
          warehouseId: primary.id,
          productId: product.id,
        },
      },
      update: { quantityOnHand: primaryQty, reorderPoint },
      create: {
        warehouseId: primary.id,
        productId: product.id,
        quantityOnHand: primaryQty,
        reorderPoint,
      },
    })
    await prisma.stockItem.upsert({
      where: {
        warehouseId_productId: {
          warehouseId: secondary.id,
          productId: product.id,
        },
      },
      update: { quantityOnHand: secondaryQty, reorderPoint },
      create: {
        warehouseId: secondary.id,
        productId: product.id,
        quantityOnHand: secondaryQty,
        reorderPoint,
      },
    })
    count += 2
  }

  console.log(`  stock items: ${count}`)
}

async function main() {
  console.log('Seeding NexonEcom development data...\n')

  console.log('1. Countries')
  await seedCountries()

  console.log('2. Roles')
  const rolesByKey = await seedRoles()

  console.log('3. Organizations')
  const organizations = await seedOrganizations()

  console.log('4. Users')
  const { staffUsers, customerUsers } = await seedUsers(organizations)
  await seedUserRoles(rolesByKey, staffUsers)
  await assignAccountOwners(organizations, staffUsers)

  console.log('5. Organization Members')
  await seedOrganizationMembers(customerUsers)

  console.log('6. Categories')
  const categories = await seedCategories()

  console.log('7. Brands')
  const brands = await seedBrands()

  console.log('8. Products')
  const products = await seedProducts(categories, brands)

  console.log('9. Product Images')
  await seedProductImages(products)

  console.log('10. Warehouses')
  const warehouses = await seedWarehouses()

  console.log('11. Stock')
  await seedStock(products, warehouses)

  console.log(
    `\nDev login (any seeded user email above): password "${DEV_PASSWORD}"`,
  )
  console.log('\nSeed completed successfully.')
}

main()
  .catch((err) => {
    console.error('\nSeed failed:', err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
