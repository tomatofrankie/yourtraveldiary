
// Cache duration: 24 hours
const CACHE_DURATION = 24 * 60 * 60 * 1000;
const RATES_CACHE_KEY = 'tripplanner_exchange_rates';

interface ExchangeRates {
  base: string;
  rates: Record<string, number>;
  timestamp: number;
}

export async function getExchangeRates(base = 'HKD'): Promise<Record<string, number>> {
  // Try to get from cache first
  const cached = localStorage.getItem(RATES_CACHE_KEY);
  if (cached) {
    const data: ExchangeRates = JSON.parse(cached);
    const now = Date.now();
    if (now - data.timestamp < CACHE_DURATION && data.base === base) {
      return data.rates;
    }
  }

  try {
    // using open.er-api.com which is free and doesn't require key
    const response = await fetch(`https://open.er-api.com/v6/latest/${base}`);
    const data = await response.json();
    
    if (data.result === 'success') {
      const ratesToCache: ExchangeRates = {
        base,
        rates: data.rates,
        timestamp: Date.now()
      };
      localStorage.setItem(RATES_CACHE_KEY, JSON.stringify(ratesToCache));
      return data.rates;
    }
    throw new Error('Failed to fetch rates');
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    // Fallback static rates if API fails
    return {
      HKD: 1,
      USD: 0.128, // 1 HKD = 0.128 USD -> 1 USD = 7.8 HKD
      JPY: 19.5,
      CNY: 0.92,
      EUR: 0.118,
      GBP: 0.10,
      KRW: 170,
      TWD: 4.05,
      THB: 4.6
    };
  }
}

export function convertCurrency(amount: number, fromCurrency: string, rates: Record<string, number>): number {
  if (fromCurrency === 'HKD') return amount;
  
  // Rates are based on HKD (1 HKD = x Foreign)
  // So to convert Foreign to HKD: Amount / Rate
  // Example: 1000 JPY / 19.5 (JPY per HKD) = ~51 HKD
  
  const rate = rates[fromCurrency];
  if (!rate) return amount; // Fallback if rate missing
  
  return amount / rate;
}
