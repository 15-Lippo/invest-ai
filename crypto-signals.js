export async function getTopCryptos() {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=500&page=1&sparkline=false');
        const cryptos = await response.json();
        return cryptos
            .filter(crypto => crypto.market_cap > 50_000_000) 
            .map(crypto => ({
                name: crypto.name,
                symbol: crypto.symbol.toUpperCase(),
                currentPrice: crypto.current_price,
                marketCap: crypto.market_cap,
                priceChangePercentage24h: crypto.price_change_percentage_24h,
                rank: crypto.market_cap_rank
            }));
    } catch (error) {
        console.error('Error fetching top cryptocurrencies:', error);
        return [];
    }
}

export async function getCryptoSignals() {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=false');
        const cryptos = await response.json();

        return cryptos
            .filter(crypto => crypto.market_cap > 5_000_000) 
            .map(crypto => {
                const { signalType, confidence, timing } = enhancedSignalAnalysis(crypto);
                const entryPrice = crypto.current_price;
                const targetPrice = calculateTargetPrice(crypto, signalType);
                const stopLoss = calculateStopLoss(crypto, signalType);

                const { support, resistance } = calculateSupportResistance(crypto);

                return {
                    id: crypto.id,
                    pair: `${crypto.symbol.toUpperCase()}/USDT`,
                    name: crypto.name,
                    signalType,
                    timing,
                    confidence: confidence,
                    entryPrice: entryPrice.toFixed(4),
                    targetPrice: targetPrice.toFixed(4),
                    stopLoss: stopLoss.toFixed(4),
                    support: support.toFixed(4),
                    resistance: resistance.toFixed(4),
                    potentialGain: ((targetPrice - entryPrice) / entryPrice * 100).toFixed(2),
                    riskReward: calculateRiskReward(entryPrice, targetPrice, stopLoss),
                    priceChange24h: crypto.price_change_percentage_24h.toFixed(2),
                    lastUpdated: new Date().toLocaleTimeString()
                };
            })
            .filter(signal => 
                signal.signalType !== 'NEUTRAL' && 
                Math.abs(parseFloat(signal.potentialGain)) > 3 
            )
            .sort((a, b) => Math.abs(parseFloat(b.potentialGain)) - Math.abs(parseFloat(a.potentialGain)))
            .slice(0, 20); 
    } catch (error) {
        console.error('Error generating crypto signals:', error);
        return [];
    }
}

function enhancedSignalAnalysis(crypto) {
    const { 
        price_change_percentage_24h: priceChange, 
        total_volume: volume,
        market_cap: marketCap 
    } = crypto;
    
    let signalType = 'NEUTRAL';
    let confidence = 0;
    let timing = 'WAIT';
    
    const volumeIndicator = volume / marketCap;
    const volatilityFactor = Math.abs(priceChange);

    if (priceChange > 7 && volumeIndicator > 0.001) {
        signalType = 'BUY';
        confidence = Math.min(volatilityFactor * 3, 95);
        timing = volatilityFactor > 15 ? 'STRONG BUY NOW' : 
                 volatilityFactor > 10 ? 'BUY SOON' : 
                 'POTENTIAL BUY';
    } else if (priceChange < -7 && volumeIndicator > 0.001) {
        signalType = 'SELL';
        confidence = Math.min(volatilityFactor * 3, 95);
        timing = volatilityFactor > 15 ? 'STRONG SELL NOW' : 
                 volatilityFactor > 10 ? 'SELL SOON' : 
                 'POTENTIAL SELL';
    }

    return { 
        signalType, 
        confidence: Math.floor(confidence),
        timing
    };
}

function calculateTargetPrice(crypto, signalType) {
    const currentPrice = crypto.current_price;
    const volatility = Math.abs(crypto.price_change_percentage_24h);
    
    return signalType === 'BUY' 
        ? currentPrice * (1 + (0.08 + volatility/100)) 
        : signalType === 'SELL' 
            ? currentPrice * (1 - (0.08 + volatility/100)) 
            : currentPrice;
}

function calculateStopLoss(crypto, signalType) {
    const currentPrice = crypto.current_price;
    const volatility = Math.abs(crypto.price_change_percentage_24h);
    
    return signalType === 'BUY' 
        ? currentPrice * (1 - (0.05 + volatility/200)) 
        : signalType === 'SELL' 
            ? currentPrice * (1 + (0.05 + volatility/200)) 
            : currentPrice;
}

function calculateRiskReward(entry, target, stopLoss) {
    const potentialProfit = Math.abs(target - entry);
    const potentialLoss = Math.abs(entry - stopLoss);
    return potentialLoss > 0 ? `1:${(potentialProfit / potentialLoss).toFixed(2)}` : '1:1';
}

function calculateSupportResistance(crypto) {
    const currentPrice = crypto.current_price;
    const priceChange = crypto.price_change_percentage_24h;
    
    const support = currentPrice * (1 - Math.abs(priceChange / 100) * 1.5);
    const resistance = currentPrice * (1 + Math.abs(priceChange / 100) * 1.5);
    
    return { support, resistance };
}

export async function getCryptoHistoricalData(symbol, days = 30) {
    try {
        const response = await fetch(`https://api.coingecko.com/api/v3/coins/${symbol.toLowerCase()}/market_chart?vs_currency=usd&days=${days}`);
        const historicalData = await response.json();
        
        const labels = historicalData.prices.map((_, index) => index);
        const prices = historicalData.prices.map(price => price[1]);
        
        return {
            labels: labels,
            datasets: [{
                label: `${symbol.toUpperCase()} Price`,
                data: prices,
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1
            }]
        };
    } catch (error) {
        console.error(`Error fetching historical data for ${symbol}:`, error);
        return null;
    }
}

export async function getCryptoFullHistoricalData(symbol, days = 90) {
    try {
        const response = await fetch(`https://api.coingecko.com/api/v3/coins/${symbol.toLowerCase()}/market_chart?vs_currency=usd&days=${days}`);
        const historicalData = await response.json();
        
        const prices = historicalData.prices.map(price => price[1]);
        const volumes = historicalData.total_volumes.map(volume => volume[1]);
        
        const sma20 = calculateSMA(prices, 20);
        const ema50 = calculateEMA(prices, 50);
        const rsi = calculateRSI(prices);
        
        return {
            prices: prices,
            volumes: volumes,
            indicators: {
                sma20: sma20,
                ema50: ema50,
                rsi: rsi
            }
        };
    } catch (error) {
        console.error(`Error fetching full historical data for ${symbol}:`, error);
        return null;
    }
}

function calculateSMA(prices, period) {
    const sma = [];
    for (let i = period - 1; i < prices.length; i++) {
        const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
        sma.push(sum / period);
    }
    return sma;
}

function calculateEMA(prices, period) {
    const multiplier = 2 / (period + 1);
    const ema = [prices[0]];
    
    for (let i = 1; i < prices.length; i++) {
        const emaValue = (prices[i] - ema[i-1]) * multiplier + ema[i-1];
        ema.push(emaValue);
    }
    
    return ema;
}

function calculateRSI(prices, period = 14) {
    const changes = prices.slice(1).map((price, i) => price - prices[i]);
    const gains = changes.map(change => Math.max(change, 0));
    const losses = changes.map(change => Math.abs(Math.min(change, 0)));
    
    const avgGain = calculateAverage(gains, period);
    const avgLoss = calculateAverage(losses, period);
    
    return avgLoss === 0 ? 100 : 100 - (100 / (1 + (avgGain / avgLoss)));
}

function calculateAverage(values, period) {
    const sum = values.slice(0, period).reduce((a, b) => a + b, 0);
    return sum / period;
}
