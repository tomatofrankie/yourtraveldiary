export const categoryColors: Record<string, string> = {
  // Schedule Categories
  food: 'bg-orange-100 text-orange-800 border-orange-200',
  shopping: 'bg-pink-100 text-pink-800 border-pink-200',
  hotel: 'bg-blue-100 text-blue-800 border-blue-200',
  transportation: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  attraction: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200',
  other: 'bg-gray-100 text-gray-800 border-gray-200',
  
  // Expenses Categories
  accommodation: 'bg-blue-100 text-blue-800 border-blue-200',
  transport: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  entertainment: 'bg-purple-100 text-purple-800 border-purple-200',
  others: 'bg-gray-100 text-gray-800 border-gray-200',

  // Shopping Categories
  clothes: 'bg-rose-100 text-rose-800 border-rose-200',
  electronics: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  souvenirs: 'bg-amber-100 text-amber-800 border-amber-200',

  // Travel Info Categories
  flight: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'car rental': 'bg-teal-100 text-teal-800 border-teal-200',
  restaurant: 'bg-orange-100 text-orange-800 border-orange-200',
};

export function getCategoryColor(category: string): string {
  const normalized = category.toLowerCase();
  return categoryColors[normalized] || 'bg-purple-100 text-purple-800 border-purple-200';
}
