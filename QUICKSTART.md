# 🚀 Quick Start Guide - AGIT ECM 2026 Doorprize 

## Step-by-Step Setup (5 Minutes)

### 1️⃣ Install Dependencies
```bash
npm install
```
Wait for all packages to download (~2-3 minutes).

### 2️⃣ Initialize Database
```bash
npm run db:migrate
```
This creates the SQLite database with sample data:
- ✅ 25 sample participants
- ✅ 8 sample prizes

### 3️⃣ Start the Application
```bash
npm run dev
```
Open http://localhost:3000 in your browser.

---

## 🎯 First Draw Tutorial

### Drawing Your First Prize

1. **Select Prize**: Choose "Voucher Belanja 1 Juta" (has 10 quota)
2. **Set Quantity**: Enter `3` winners
3. **Click ROLL**: Watch the slot machine animation
4. **Verify Winners**: 
   - Pretend to call each name
   - Click ❌ on one winner to simulate "absent"
5. **Confirm**: Click "CONFIRM ALL WINNERS"

### Check Results

1. Go to **Admin Dashboard** (top right button)
2. See:
   - Participants tab: 2 winners marked
   - Prizes tab: Voucher quota reduced to 7
   - Winners tab: 2 confirmed winners with timestamp

---

## 🎨 Understanding the Interface

### Main Draw Page
- **Stats Bar**: Shows total participants, eligible, and prizes
- **Control Panel**: Select prize and quantity
- **Slot Machine**: Animated draw experience
- **Results Section**: Verify and remove absent winners

### Admin Dashboard
- **Participants Tab**: See all registered participants
- **Prizes Tab**: Monitor prize stock levels
- **Winners Tab**: View complete winner history

---

## 📊 Database Overview

### Participants Status
- **Eligible** (Blue badge): Can still win prizes
- **Winner** (Green badge): Already won, excluded from future draws

### Prize Status
- **Available** (Green): Has stock remaining
- **Out of Stock** (Red): No quota left

---

## 🔧 Common Tasks

### Add Custom Participants
Edit `scripts/migrate.js`:
```javascript
const participants = [
  { name: 'Your Name', nim: '123456789' },
  // Add more...
];
```
Then reset database:
```bash
rm luckydraw.db
npm run db:migrate
```

### Add Custom Prizes
Edit `scripts/migrate.js`:
```javascript
const prizes = [
  { name: 'Your Prize', quota: 5 },
  // Add more...
];
```
Reset database same as above.

### Reset All Winners
Delete database and re-migrate:
```bash
rm luckydraw.db
npm run db:migrate
npm run dev
```

---

## ⚡ Pro Tips

1. **Multiple Draws**: You can draw different prizes for different events
2. **Absent Handling**: Always verify attendance before confirming
3. **Stock Check**: Monitor prize quotas in Admin Dashboard
4. **History**: Winners tab keeps permanent records
5. **Fair Selection**: Algorithm uses true randomization

---

## 🐛 Quick Troubleshooting

**Problem**: "No prizes available"
- **Solution**: Run `npm run db:migrate` to initialize data

**Problem**: "Not enough eligible participants"
- **Solution**: Some are already winners. Check Admin Dashboard

**Problem**: Database error
- **Solution**: Delete `luckydraw.db` and run migration again

**Problem**: Animation not smooth
- **Solution**: Close other browser tabs, restart dev server

---

## 📱 Production Deployment

For actual events:

1. **Build**: `npm run build`
2. **Start**: `npm start`
3. **Access**: Open on event laptop/tablet
4. **Project**: Display on big screen for audience

---

## 🎉 You're Ready!

Start drawing prizes and enjoy the professional draw experience!

**Need help?** Check the full README.md for detailed documentation.
