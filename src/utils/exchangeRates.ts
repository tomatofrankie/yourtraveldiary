// Exchange rate utility with caching and fallback rates
// Uses exchangerate.host which doesn't require an API key

const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

interface ExchangeRates {
  [currency: string]: number; // rate to HKD (1 unit of currency = X HKD)
  HKD: 1;
}

let cachedRates: ExchangeRates | null = null;
let lastFetchTime = 0;

// Fallback rates (updated occasionally, better than nothing)
const fallbackRates: ExchangeRates = {
  HKD: 1,
  USD: 7.85,
  EUR: 8.45,
  GBP: 9.95,
  JPY: 0.053,
  CNY: 1.08,
  AUD: 5.15,
  CAD: 5.75,
  CHF: 8.65,
  SGD: 5.85,
  TWD: 0.25,
  KRW: 0.0058,
  THB: 0.22,
};

export async function getExchangeRates(): Promise<ExchangeRates> {
  // Return cached rates if still valid
  const now = Date.now();
  if (cachedRates && now - lastFetchTime < CACHE_DURATION) {
    return cachedRates;
  }

  try {
    const response = await fetch('https://api.exchangerate.host/latest?base=HKD');
    if (!response.ok) {
      throw new Error(`API response: ${response.status}`);
    }
    const data = await response.json();
    
    if (data.success !== true || !data.rates) {
      throw new Error('Invalid API response');
    }

    // Convert from HKD base to rates where 1 unit of currency = X HKD
    // API returns rates where 1 HKD = X foreign currency
    // We need inverse: 1 foreign currency = X HKD
    const rates: ExchangeRates = { HKD: 1 };
    Object.entries(data.rates).forEach(([currency, rate]) => {
      if (typeof rate === 'number' && rate > 0) {
        rates[currency] = 1 / rate;
      }
    });

    // Ensure all our supported currencies have rates
    Object.keys(fallbackRates).forEach(currency => {
      if (!rates[currency] && currency !== 'HKD') {
        rates[currency] = fallbackRates[currency];
      }
    });

    cachedRates = rates;
    lastFetchTime = now;
    return rates;
  } catch (error) {
    console.warn('Failed to fetch exchange rates, using fallback:', error);
    return { ...fallbackRates };
  }
}

export async function convertToHKD(amount: number, currency: string): Promise<number> {
  if (currency === 'HKD') return amount;
  
  const rates = await getExchangeRates();
  const rate = rates[currency];
  if (!rate) {
    console.warn(`No exchange rate for ${currency}, using 1:1`);
    return amount;
  }
  return amount * rate;
}

export async function getTotalInHKD(items: { price: number; currency: string }[]): Promise<number> {
  if (items.length === 0) return 0;
  
  const rates = await getExchangeRates();
  let total = 0;
  
  for (const item of items) {
    const rate = rates[item.currency] || 1;
    total += item.price * rate;
  }
  
  return total;
}

export function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}