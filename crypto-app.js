import { getCryptoHistoricalData, getCryptoFullHistoricalData, getCryptoSignals, getTopCryptos } from './crypto-signals.js';

function renderCryptoSignals(signals) {
    const container = document.getElementById('cryptoSignalsContainer');
    container.innerHTML = signals.map(signal => `
        <div class="crypto-card p-3 mb-2" 
             data-crypto-id="${signal.id}"
             data-support="${signal.support}"
             data-resistance="${signal.resistance}"
             data-entry-price="${signal.entryPrice}"
             data-pair="${signal.pair}"
             data-last-updated="${signal.lastUpdated}">
            <div class="d-flex justify-content-between align-items-center mb-2">
                <h5 class="mb-0">${signal.pair}</h5>
                <span class="signal-badge ${
                    signal.signalType === 'BUY' ? 'bg-success text-white' : 
                    signal.signalType === 'SELL' ? 'bg-danger text-white' : 'bg-secondary text-white'
                }">
                    ${signal.signalType}
                </span>
            </div>
            <div class="row mb-2">
                <div class="col-6">
                    <small class="text-muted">Timing</small>
                    <p class="mb-0 ${
                        signal.timing.includes('STRONG') ? 'text-success fw-bold' : 
                        signal.timing.includes('SOON') ? 'text-warning' : 'text-info'
                    }">
                        ${signal.timing}
                    </p>
                </div>
                <div class="col-6 text-end">
                    <small class="text-muted">Last Updated</small>
                    <p class="mb-0">${signal.lastUpdated}</p>
                </div>
            </div>
            <div class="row">
                <div class="col-6">
                    <small class="text-muted">Entry Price</small>
                    <p class="mb-0">$${signal.entryPrice}</p>
                </div>
                <div class="col-6 text-end">
                    <small class="text-muted">24h Change</small>
                    <p class="mb-0 ${signal.priceChange24h > 0 ? 'text-success' : 'text-danger'}">
                        ${signal.priceChange24h}%
                    </p>
                </div>
            </div>
            <div class="row mt-2">
                <div class="col-4">
                    <small class="text-muted">Target</small>
                    <p class="mb-0 text-success">$${signal.targetPrice}</p>
                </div>
                <div class="col-4">
                    <small class="text-muted">Stop Loss</small>
                    <p class="mb-0 text-danger">$${signal.stopLoss}</p>
                </div>
                <div class="col-4 text-end">
                    <small class="text-muted">Gain %</small>
                    <p class="mb-0 ${signal.potentialGain > 0 ? 'text-success' : 'text-danger'}">
                        ${signal.potentialGain}%
                    </p>
                </div>
            </div>
            <div class="row mt-2">
                <div class="col-6">
                    <small class="text-muted">Support</small>
                    <p class="mb-0">$${signal.support}</p>
                </div>
                <div class="col-6 text-end">
                    <small class="text-muted">Resistance</small>
                    <p class="mb-0">$${signal.resistance}</p>
                </div>
            </div>
        </div>
    `).join('');

    // Attach click events to each crypto-card to show detailed chart with indicators
    document.querySelectorAll('.crypto-card').forEach(card => {
        card.addEventListener('click', async function() {
            const cryptoId = this.getAttribute('data-crypto-id');
            const support = parseFloat(this.getAttribute('data-support'));
            const resistance = parseFloat(this.getAttribute('data-resistance'));
            const entryPrice = parseFloat(this.getAttribute('data-entry-price'));
            const pair = this.getAttribute('data-pair');
            const lastUpdated = this.getAttribute('data-last-updated');

            // Set modal title with crypto pair and last update time
            document.getElementById('cryptoChartTitle').textContent = `${pair} - ${lastUpdated}`;

            // Fetch full historical data with detailed indicators (Price, SMA20, EMA50)
            const fullHistoricalData = await getCryptoFullHistoricalData(cryptoId, 30);
            if (!fullHistoricalData) return;

            const priceData = fullHistoricalData.prices;
            const labels = priceData.map((_, idx) => idx + 1);

            // Align SMA20 (calculated over a period of 20) with the full price data
            const smaRaw = fullHistoricalData.indicators.sma20;
            const smaAligned = new Array(priceData.length).fill(null);
            for (let i = 19; i < priceData.length; i++) {
                smaAligned[i] = smaRaw[i - 19];
            }

            const emaData = fullHistoricalData.indicators.ema50;
            const supportData = new Array(priceData.length).fill(support);
            const resistanceData = new Array(priceData.length).fill(resistance);

            const ctx = document.getElementById('cryptoChart').getContext('2d');
            if (window.cryptoChartInstance) {
                window.cryptoChartInstance.destroy();
            }

            window.cryptoChartInstance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Price',
                            data: priceData,
                            borderColor: '#00FF00',
                            tension: 0.2,
                            fill: false,
                            borderWidth: 2
                        },
                        {
                            label: 'SMA20',
                            data: smaAligned,
                            borderColor: '#00CC00',
                            borderDash: [5, 5],
                            tension: 0.2,
                            fill: false,
                            borderWidth: 1.5
                        },
                        {
                            label: 'EMA50',
                            data: emaData,
                            borderColor: '#009900',
                            borderDash: [10, 5],
                            tension: 0.2,
                            fill: false,
                            borderWidth: 1.5
                        },
                        {
                            label: 'Support',
                            data: supportData,
                            borderColor: '#AAAAAA',
                            borderDash: [3, 3],
                            tension: 0,
                            fill: false,
                            borderWidth: 1
                        },
                        {
                            label: 'Resistance',
                            data: resistanceData,
                            borderColor: '#FF0000',
                            borderDash: [3, 3],
                            tension: 0,
                            fill: false,
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    interaction: {
                        mode: 'index',
                        intersect: false
                    },
                    plugins: {
                        legend: {
                            labels: {
                                color: 'white',
                                font: {
                                    family: 'Inter',
                                    size: 12
                                }
                            }
                        },
                        tooltip: {
                            titleFont: {
                                family: 'Inter',
                                size: 14
                            },
                            bodyFont: {
                                family: 'Inter',
                                size: 12
                            }
                        }
                    },
                    scales: {
                        x: {
                            ticks: {
                                color: 'white'
                            },
                            grid: {
                                color: '#333'
                            },
                            title: {
                                display: true,
                                text: 'Time',
                                color: 'white',
                                font: {
                                    family: 'Inter',
                                    size: 14
                                }
                            }
                        },
                        y: {
                            ticks: {
                                color: 'white'
                            },
                            grid: {
                                color: '#333'
                            },
                            title: {
                                display: true,
                                text: 'Price (USD)',
                                color: 'white',
                                font: {
                                    family: 'Inter',
                                    size: 14
                                }
                            }
                        }
                    }
                }
            });

            // Show the chart modal using Bootstrap's modal
            const modalEl = document.getElementById('cryptoChartModal');
            const modal = new bootstrap.Modal(modalEl);
            modal.show();
        });
    });
}

function loadMarketOverview() {
    // Fetch and render top cryptocurrencies in the Market Overview section.
    getTopCryptos().then(topCryptos => {
        const container = document.getElementById('topCryptosContainer');
        container.innerHTML = topCryptos.map(crypto => `
            <div class="col-6 col-md-3 mb-3">
                <div class="crypto-card p-2 text-center">
                    <h6>${crypto.symbol}</h6>
                    <p class="mb-0">${crypto.name}</p>
                    <p class="mb-0">Prezzo: $${crypto.currentPrice.toFixed(2)}</p>
                    <p class="mb-0">Rank: ${crypto.rank}</p>
                </div>
            </div>
        `).join('');
    }).catch(err => {
        console.error('Error loading top cryptos:', err);
    });
}

function loadCryptoSignals() {
    // Fetch and render trading signals in the Signals section.
    getCryptoSignals().then(signals => {
        const container = document.getElementById('cryptoSignalsContainer');
        if (signals.length === 0) {
            container.innerHTML = '<div class="text-center text-warning p-3">Nessun segnale disponibile al momento.</div>';
        } else {
            renderCryptoSignals(signals);
        }
    }).catch(err => {
        console.error('Error loading crypto signals:', err);
    });
}

function setupNavigation() {
    // Enable bottom navigation to toggle between sections.
    const navItems = document.querySelectorAll('.bottom-nav .nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            // Remove active class from all nav items.
            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');

            // Hide all sections.
            document.getElementById('marketOverviewSection').classList.add('d-none');
            document.getElementById('signalsSection').classList.add('d-none');
            document.getElementById('chartSection').classList.add('d-none');

            // Determine target section (append "Section" if needed).
            let section = this.getAttribute('data-section');
            let targetSectionId = section === 'marketOverview' ? 'marketOverviewSection' :
                                  section === 'signals' ? 'signalsSection' :
                                  'chartSection';

            document.getElementById(targetSectionId).classList.remove('d-none');

            // Load content based on selected section.
            if(targetSectionId === 'signalsSection') {
                loadCryptoSignals();
            } else if(targetSectionId === 'marketOverviewSection') {
                loadMarketOverview();
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', function() {
    setupNavigation();
    // Load default section: Market Overview.
    loadMarketOverview();
});
