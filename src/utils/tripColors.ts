export const tripColorPalette = [
  { name: 'Light Purple', value: 'bg-purple-100 text-purple-800 border-purple-200', bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200', gradient: 'from-purple-300 to-purple-500' },
  { name: 'Soft Blue', value: 'bg-blue-100 text-blue-800 border-blue-200', bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200', gradient: 'from-blue-300 to-blue-500' },
  { name: 'Mint Green', value: 'bg-emerald-100 text-emerald-800 border-emerald-200', bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-200', gradient: 'from-emerald-300 to-emerald-500' },
  { name: 'Peach', value: 'bg-orange-100 text-orange-800 border-orange-200', bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200', gradient: 'from-orange-300 to-orange-500' },
  { name: 'Rose Pink', value: 'bg-pink-100 text-pink-800 border-pink-200', bg: 'bg-pink-100', text: 'text-pink-800', border: 'border-pink-200', gradient: 'from-pink-300 to-pink-500' },
  { name: 'Lavender', value: 'bg-violet-100 text-violet-800 border-violet-200', bg: 'bg-violet-100', text: 'text-violet-800', border: 'border-violet-200', gradient: 'from-violet-300 to-violet-500' },
  { name: 'Sky Blue', value: 'bg-sky-100 text-sky-800 border-sky-200', bg: 'bg-sky-100', text: 'text-sky-800', border: 'border-sky-200', gradient: 'from-sky-300 to-sky-500' },
  { name: 'Teal', value: 'bg-teal-100 text-teal-800 border-teal-200', bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-200', gradient: 'from-teal-300 to-teal-500' },
  { name: 'Amber', value: 'bg-amber-100 text-amber-800 border-amber-200', bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200', gradient: 'from-amber-300 to-amber-500' },
  { name: 'Cyan', value: 'bg-cyan-100 text-cyan-800 border-cyan-200', bg: 'bg-cyan-100', text: 'text-cyan-800', border: 'border-cyan-200', gradient: 'from-cyan-300 to-cyan-500' },
  { name: 'Fuchsia', value: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200', bg: 'bg-fuchsia-100', text: 'text-fuchsia-800', border: 'border-fuchsia-200', gradient: 'from-fuchsia-300 to-fuchsia-500' },
  { name: 'Rose', value: 'bg-rose-100 text-rose-800 border-rose-200', bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-200', gradient: 'from-rose-300 to-rose-500' },
  { name: 'Indigo', value: 'bg-indigo-100 text-indigo-800 border-indigo-200', bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-200', gradient: 'from-indigo-300 to-indigo-500' },
  { name: 'Lime', value: 'bg-lime-100 text-lime-800 border-lime-200', bg: 'bg-lime-100', text: 'text-lime-800', border: 'border-lime-200', gradient: 'from-lime-300 to-lime-500' },
  { name: 'Gray', value: 'bg-gray-100 text-gray-800 border-gray-200', bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200', gradient: 'from-gray-300 to-gray-500' },
];

export function getTripColorClasses(colorName?: string) {
  const defaultColor = tripColorPalette[0];
  if (!colorName) return defaultColor.value;
  
  const color = tripColorPalette.find(c => c.name === colorName);
  return color ? color.value : defaultColor.value;
}

export function getTripColorBg(colorName?: string) {
  const defaultColor = tripColorPalette[0];
  if (!colorName) return defaultColor.bg;
  
  const color = tripColorPalette.find(c => c.name === colorName);
  return color ? color.bg : defaultColor.bg;
}