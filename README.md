# TripPlanner - Your Complete Travel Companion 🌍✈️

A comprehensive iPhone-friendly travel planning app that helps you organize every aspect of your trip - from daily schedules to expenses, shopping lists, and travel information.

![TripPlanner](https://img.shields.io/badge/React-19.2.3-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-blue)
![Tailwind](https://img.shields.io/badge/Tailwind-4.1.17-blue)

## 🌟 Features

### 📱 Five Main Sections

#### 1. **Homepage (Dashboard)**
- Daily itinerary overview with timeline view
- Automatic weather forecasting for each day
- Clothing and packing suggestions based on weather
- Beautiful trip header with destination and dates
- Day-by-day breakdown with all scheduled activities

#### 2. **Travel Schedule**
- Create and manage daily itineraries
- Add activities with:
  - Date and time
  - Location
  - Category (food, shopping, hotel, transportation, attraction, other)
  - Google Maps integration
  - Custom notes
- Timeline view grouped by date
- Edit and delete functionality

#### 3. **Travel Expenses**
- Track all trip expenses
- Multi-currency support (USD, EUR, GBP, JPY, CNY, AUD, CAD, CHF, HKD, SGD)
- Category-based organization
- Automatic totals calculation
- Daily expense summaries
- Detailed expense breakdown with edit/delete options

#### 4. **Shopping List**
- Create shopping items with categories
- Upload and preview images
- Visual grid layout grouped by category
- Mark items as purchased
- Track shopping progress

#### 5. **Travel Information**
- Store important travel details:
  - Hotel bookings
  - Flight information
  - Car rentals
  - Restaurant reservations
- Share/Sync feature with JSON export/import
- Confirmation numbers and contact details
- Organized by type

### 🎯 Key Features

- ✅ **Multiple Trip Management**: Create and switch between different trips
- ✅ **Offline-First**: Works without internet using localStorage
- ✅ **Mobile-Optimized**: Responsive design perfect for iPhone
- ✅ **Import/Export & Share**: Three ways to share trip data with others
  - 📥 Export trips as JSON files
  - 📤 Import trips from JSON files
  - 📋 Copy trip data to clipboard
- ✅ **Weather Integration**: Smart packing suggestions
- ✅ **Visual Design**: Clean, modern UI with gradient accents
- ✅ **No Setup Required**: Works immediately without backend

## 🚀 Getting Started

### Prerequisites

- Node.js 16+ installed
- npm or yarn package manager

### Installation

1. **Clone or download the project**

2. **Install dependencies**
```bash
npm install
```

3. **Run the development server**
```bash
npm run dev
```

4. **Open in browser**
Navigate to `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The built app will be in the `dist` folder.

## 📤 Sharing & Backup

This app includes powerful **Import/Export** features to share trips with others or create backups. See the detailed [Import/Export Guide](./IMPORT_EXPORT_GUIDE.md) for:

- 📥 How to export trips as JSON files
- 📤 How to import trips from others
- 📋 Quick clipboard sharing
- 🔄 Multi-device workflows
- 💾 Backup strategies

**Quick start:** Click the "Share" button in the top navigation!

## 📖 How to Use

### Creating Your First Trip

1. Click the **"New Trip"** button in the top right
2. Fill in:
   - Trip name (e.g., "Summer Vacation 2024")
   - Destination (e.g., "Paris, France")
   - Start and end dates
3. Click **"Create Trip"**

### Adding Schedule Items

1. Go to the **"Schedule"** tab
2. Click **"Add Schedule"**
3. Fill in the activity details
4. Add Google Maps link for easy navigation
5. Save and see it appear in the timeline

### Tracking Expenses

1. Go to the **"Expenses"** tab
2. Click **"Add Expense"**
3. Enter item, price, currency, and category
4. View automatic totals by currency and category

### Managing Shopping List

1. Go to the **"Shopping"** tab
2. Click **"Add Item"**
3. Upload item image (optional)
4. Mark items as purchased when shopping

### Storing Travel Information

1. Go to the **"Info"** tab
2. Click **"Add Info"**
3. Select type (hotel, flight, car-rental, restaurant)
4. Store all important details

### Sharing Trips with Others

The app includes **three methods** to share your trip data:

#### Method 1: Export as File
1. Click the **"Share"** button in the top navigation
2. Select **"Export Trip"**
3. A JSON file will download (e.g., `Summer_Vacation_2024_2024-01-15.json`)
4. Send this file to friends/family via email, messaging apps, or cloud storage
5. They can import it using Method 2 below

#### Method 2: Import from File
1. Receive the JSON file from someone
2. Click the **"Share"** button
3. Select **"Import Trip"**
4. Choose the JSON file from your device
5. The trip will be added to your trips list with "(Imported)" suffix

#### Method 3: Copy to Clipboard
1. Click the **"Share"** button
2. Select **"Copy to Clipboard"**
3. The entire trip data is copied as text
4. Share this text via any messaging app
5. Recipients can paste it into a text file, save as `.json`, and import

**What gets exported/imported?**
- ✅ Trip details (name, dates, destination)
- ✅ All schedule items
- ✅ All expenses
- ✅ Shopping list items
- ✅ Travel information (hotels, flights, etc.)

## 🗄️ Cloud Storage with Neon

Currently, the app uses **localStorage** for data persistence. For cloud storage and sync capabilities, see the detailed [Neon Setup Guide](./NEON_SETUP.md).

### Why Neon?

- ☁️ Cloud-based Postgres database
- 🔄 Multi-device sync
- 🔒 Secure and reliable
- 💰 Generous free tier
- 🚀 Serverless architecture

## 🛠️ Technology Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS 4** - Styling
- **Vite 7** - Build tool
- **date-fns** - Date handling
- **Lucide React** - Icons
- **@neondatabase/serverless** - Cloud database (optional)

## 📂 Project Structure

```
src/
├── components/
│   ├── Homepage.tsx          # Dashboard with weather
│   ├── TravelSchedule.tsx    # Daily itinerary
│   ├── TravelExpenses.tsx    # Expense tracking
│   ├── ShoppingList.tsx      # Shopping items
│   └── TravelInfo.tsx        # Travel details
├── utils/
│   ├── storage.ts            # Data persistence
│   ├── weather.ts            # Weather forecasting
│   └── cn.ts                 # Utility functions
├── types.ts                  # TypeScript definitions
└── App.tsx                   # Main app component
```

## 🎨 Features Breakdown

### Homepage
- Real-time weather for each day
- Clothing suggestions
- Daily activity timeline
- Trip overview card

### Schedule
- Time-based organization
- Category badges
- Google Maps integration
- Notes for each activity

### Expenses
- Multi-currency support
- Category breakdown
- Daily summaries
- Running totals

### Shopping
- Image support
- Purchase tracking
- Category grouping
- Visual grid layout

### Travel Info
- Multiple info types
- Export/import functionality
- Detailed contact information
- Organized by type

## 💾 Data Storage

All data is stored locally in your browser using localStorage:
- Works offline
- No account required
- Instant access
- Privacy-focused

**Want cloud sync?** See the [Neon Setup Guide](./NEON_SETUP.md)

## 🌐 Browser Compatibility

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers

## 📱 Mobile App

While this is a web app, you can:
1. Add to Home Screen on iPhone/Android
2. Use as a Progressive Web App (PWA)
3. Works offline once loaded

## 🔮 Future Enhancements

- [ ] PWA support with offline functionality
- [ ] Real weather API integration (OpenWeatherMap)
- [ ] PDF export of itinerary
- [ ] Multiple language support
- [ ] Dark mode
- [ ] Collaborative trip planning
- [ ] Budget tracking and alerts
- [ ] Photo gallery for trips

## 🤝 Contributing

This is a personal project, but suggestions and feedback are welcome!

## 📄 License

MIT License - feel free to use this project for your own trips!

## 🙏 Acknowledgments

- Icons by [Lucide](https://lucide.dev)
- UI inspiration from modern travel apps
- Built with ❤️ for travelers

## 📧 Support

For issues or questions:
1. Check the [Neon Setup Guide](./NEON_SETUP.md) for database questions
2. Review the code comments for implementation details
3. Open an issue on GitHub

---

**Happy Traveling! ✈️🌍🎒**

Made with React, TypeScript, and Tailwind CSS
