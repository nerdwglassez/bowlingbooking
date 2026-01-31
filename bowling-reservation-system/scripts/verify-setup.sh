#!/bin/bash

# Setup Verification Script
# Run this to verify your setup is correct

echo "🔍 Verifying Setup..."
echo ""

# Check Node.js
echo "1. Checking Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "   ✅ Node.js installed: $NODE_VERSION"
else
    echo "   ❌ Node.js not found. Please install Node.js 18+"
    exit 1
fi

# Check npm
echo "2. Checking npm..."
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo "   ✅ npm installed: $NPM_VERSION"
else
    echo "   ❌ npm not found"
    exit 1
fi

# Check if node_modules exists
echo "3. Checking dependencies..."
if [ -d "node_modules" ]; then
    echo "   ✅ Dependencies installed"
else
    echo "   ⚠️  Dependencies not installed. Run: npm install"
fi

# Check .env.local
echo "4. Checking environment file..."
if [ -f ".env.local" ]; then
    echo "   ✅ .env.local exists"
    
    # Check DATABASE_URL
    if grep -q "DATABASE_URL=" .env.local; then
        echo "   ✅ DATABASE_URL is set"
    else
        echo "   ⚠️  DATABASE_URL not found in .env.local"
    fi
    
    # Check NEXTAUTH_SECRET
    if grep -q "NEXTAUTH_SECRET=" .env.local; then
        echo "   ✅ NEXTAUTH_SECRET is set"
    else
        echo "   ⚠️  NEXTAUTH_SECRET not found in .env.local"
    fi
else
    echo "   ⚠️  .env.local not found. Create it from SETUP.md"
fi

# Check Prisma
echo "5. Checking Prisma..."
if [ -d "node_modules/.prisma" ]; then
    echo "   ✅ Prisma Client generated"
else
    echo "   ⚠️  Prisma Client not generated. Run: npm run db:generate"
fi

# Check TypeScript
echo "6. Checking TypeScript configuration..."
if [ -f "tsconfig.json" ]; then
    echo "   ✅ tsconfig.json exists"
else
    echo "   ❌ tsconfig.json not found"
    exit 1
fi

# Check Prisma schema
echo "7. Checking Prisma schema..."
if [ -f "prisma/schema.prisma" ]; then
    echo "   ✅ Prisma schema exists"
else
    echo "   ❌ Prisma schema not found"
    exit 1
fi

echo ""
echo "✅ Setup verification complete!"
echo ""
echo "Next steps:"
echo "  1. If dependencies aren't installed: npm install"
echo "  2. If .env.local is missing: Create it from SETUP.md"
echo "  3. Generate Prisma Client: npm run db:generate"
echo "  4. Push database schema: npm run db:push"
echo "  5. Start dev server: npm run dev"



