let currentPage = 1;
const limit = 50;
let currentSearch = '';
let currentStyle = '';
let currentSort = 'brewery_asc';
let stylesLoaded = false;
let breweryDatabaseMap = {};

async function fetchBeers(page = 1) {
    try {
        const url = `/api/beers?page=${page}&limit=${limit}&search=${encodeURIComponent(currentSearch)}&style=${encodeURIComponent(currentStyle)}&sort=${currentSort}`;
        const response = await fetch(url);
        const data = await response.json();
        
        renderBeers(data.beers);

        const avgRatingVal = 3.6; 
        const avgColor = getRankColor(avgRatingVal);
        
        document.getElementById('avg-rating-num').textContent = avgRatingVal.toFixed(1);
        document.getElementById('avg-rating-num').style.color = avgColor;

        let avgStarsHtml = '';
        for (let i = 1; i <= 5; i++) {
            const fillPercentage = Math.max(0, Math.min(1, avgRatingVal - (i - 1))) * 100;
            avgStarsHtml += `
                <span style="position: relative; display: inline-block; font-size: 16px; color: rgba(255,255,255,0.15);">
                    ★
                    <span style="position: absolute; top: 0; left: 0; overflow: hidden; width: ${fillPercentage}%; color: ${avgColor};">
                        ★
                    </span>
                </span>`;
        }
        document.getElementById('avg-rating-stars').innerHTML = avgStarsHtml;
        
        // Update Total Beers & Breweries Stats Counters
        document.getElementById('total-beers').textContent = data.total.toLocaleString();
        
        const breweriesEl = document.getElementById('total-breweries') || document.querySelector('.breweries-count-element');
        if (breweriesEl && data.totalBreweries !== undefined) {
            breweriesEl.textContent = data.totalBreweries.toLocaleString();
        }

        const totalPages = Math.ceil(data.total / limit) || 1;
        document.getElementById('page-indicator').textContent = `Page ${data.page} of ${totalPages}`;
        
        document.getElementById('prev-btn').disabled = data.page <= 1;
        document.getElementById('next-btn').disabled = data.page >= totalPages;
        
        currentPage = data.page;

        if (!stylesLoaded && data.styles) {
            const styleSelect = document.getElementById('style-filter');
            data.styles.forEach(styleName => {
                const opt = document.createElement('option');
                opt.value = styleName;
                opt.textContent = styleName;
                styleSelect.appendChild(opt);
            });
            stylesLoaded = true;
        }
    } catch (error) {
        console.error('Error loading beers:', error);
    }
}

// Convert SRM value to approximate beer color hex
function srmToHex(srm, styleName) {
    const numSrm = parseFloat(srm);
    if (!isNaN(numSrm) && numSrm > 0) {
        const s = Math.max(0, Math.min(40, numSrm));
        if (s <= 2) return '#f7e1a1';
        if (s <= 4) return '#e19726';
        if (s <= 6) return '#d1730c';
        if (s <= 9) return '#b74d00';
        if (s <= 12) return '#9f3400';
        if (s <= 16) return '#811f00';
        if (s <= 20) return '#681200';
        if (s <= 25) return '#500900';
        if (s <= 30) return '#3d0600';
        return '#1a0300';
    }

    const style = (styleName || '').toLowerCase();
    if (style.includes('stout') || style.includes('porter') || style.includes('black') || style.includes('quad')) return '#260602';
    if (style.includes('brown') || style.includes('bock') || style.includes('dubbel')) return '#6e260a';
    if (style.includes('amber') || style.includes('red') || style.includes('ipa')) return '#d1730c';
    if (style.includes('pilsner') || style.includes('blonde') || style.includes('light') || style.includes(' kölsch')) return '#f7e1a1';
    
    return '#e19726';
}

function getGlasswareSvg(styleName, hexColor) {
    const style = (styleName || '').toLowerCase();
    if (style.includes('belgian') || style.includes('abbey') || style.includes('quad') || style.includes('dubbel') || style.includes('tripel')) {
        return `
            <svg width="22" height="28" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 3C5 3 4 12 10 14V26H7V29H17V26H14V14C20 12 19 3 19 3H5Z" fill="${hexColor}" fill-opacity="0.9" stroke="#9ca3af" stroke-width="1.5" stroke-linejoin="round"/>
                <path d="M6 4H18C18 4 17.5 10 12 10C6.5 10 6 4 6 4Z" fill="#f9fafb" />
            </svg>`;
    }
    if (style.includes('sour') || style.includes('saison') || style.includes('wild') || style.includes('lambic') || style.includes('farmhouse')) {
        return `
            <svg width="22" height="28" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 3C6 3 3 11 8 16C10 18 10 20 9 26H7V29H17V26H15C14 20 14 18 16 16C21 11 18 3 18 3H6Z" fill="${hexColor}" fill-opacity="0.9" stroke="#9ca3af" stroke-width="1.5" stroke-linejoin="round"/>
                <path d="M6.5 4H17.5C17.5 4 17 9 12 9C7 9 6.5 4 6.5 4Z" fill="#f9fafb" />
            </svg>`;
    }
    if (style.includes('stout') || style.includes('porter') || style.includes('black')) {
        return `
            <svg width="22" height="28" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 4H19L17.5 14C19 16 19.5 22 18 27C17 30 15 30 12 30C9 30 7 30 6 27C4.5 22 5 16 6.5 14L5 4Z" fill="${hexColor}" fill-opacity="0.9" stroke="#9ca3af" stroke-width="1.5" stroke-linejoin="round"/>
                <path d="M4.5 4C4.5 3 5.5 2 6.5 2H17.5C18.5 2 19.5 3 19.5 4V6H4.5V4Z" fill="#f9fafb" />
            </svg>`;
    }
    return `
        <svg width="22" height="28" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 4H20L18 26C17.5 29 15 30 12 30C9 30 6.5 29 6 26L4 4Z" fill="${hexColor}" fill-opacity="0.85" stroke="#9ca3af" stroke-width="2" stroke-linejoin="round"/>
            <path d="M3 4C3 3 4 2 5 2H19C20 2 21 3 21 4V6H3V4Z" fill="#f9fafb" />
        </svg>`;
}

function getRankColor(rank) {
    const val = Math.max(1, Math.min(5, parseFloat(rank) || 0));
    if (val <= 3) {
        const t = (val - 1) / 2;
        return `rgb(239, ${Math.round(68 + (158 - 68) * t)}, 68)`;
    } else {
        const t = (val - 3) / 2;
        return `rgb(${Math.round(245 - 229 * t)}, ${Math.round(158 + 27 * t)}, ${Math.round(11 + 118 * t)})`;
    }
}

function interpolateColor(color1, color2, factor) {
    const c1 = parseInt(color1.slice(1), 16);
    const c2 = parseInt(color2.slice(1), 16);
    const r = Math.round((c1 >> 16) + factor * ((c2 >> 16) - (c1 >> 16)));
    const g = Math.round(((c1 >> 8) & 255) + factor * (((c2 >> 8) & 255) - ((c1 >> 8) & 255)));
    const b = Math.round((c1 & 255) + factor * ((c2 & 255) - (c1 & 255)));
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function getAbvPercentileColor(abv) {
    const val = Math.max(0, Math.min(15, parseFloat(abv) || 0));
    const ratio = val / 15;
    return ratio < 0.5 ? interpolateColor('#3b82f6', '#6366f1', ratio * 2) : interpolateColor('#6366f1', '#8b5cf6', (ratio - 0.5) * 2);
}

function getIbuPercentileColor(ibu) {
    const val = Math.max(0, Math.min(100, parseFloat(ibu) || 0));
    return interpolateColor('#f59e0b', '#10b981', val / 100);
}

function createGaugeHtml(value, max, color, type) {
    const num = parseFloat(value);
    if (isNaN(num) || num <= 0) return `<span style="color: var(--text-muted); font-size: 11px;">--</span>`;
    const percentage = Math.min(100, Math.max(0, (num / max) * 100));
    const rotationAngle = (percentage / 100) * 180 - 90;
    const iconSvg = type === 'abv' 
        ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="${color}" xmlns="http://www.w3.org/2000/svg"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>`
        : `<svg width="16" height="16" viewBox="0 0 24 24" fill="${color}" xmlns="http://www.w3.org/2000/svg"><path d="M12 2c-2 3-5 5-5 9a5 5 0 0 0 10 0c0-4-3-6-5-9z"/></svg>`;

    return `
        <div style="display: flex; flex-direction: column; align-items: center; width: 85px;">
            <span style="font-size: 11px; font-weight: 600; color: var(--text-main); margin-bottom: 2px;">${num.toFixed(num > 10 ? 0 : 2)}${type === 'abv' ? '%' : ''}</span>
            <div style="position: relative; width: 64px; height: 34px; overflow: hidden;">
                <svg width="64" height="34" viewBox="0 0 64 34" style="position: absolute; top: 0; left: 0;">
                    <path d="M 6 30 A 26 26 0 0 1 58 30" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="5" stroke-linecap="round"/>
                    <path d="M 6 30 A 26 26 0 0 1 58 30" fill="none" stroke="${color}" stroke-width="5" stroke-linecap="round" stroke-dasharray="81.68" stroke-dashoffset="${81.68 - (81.68 * (percentage / 100))}" style="transition: stroke-dashoffset 0.4s ease;"/>
                </svg>
                <div style="position: absolute; bottom: 2px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; justify-content: center;">${iconSvg}</div>
                <div style="position: absolute; bottom: 2px; left: 50%; width: 48px; height: 48px; transform: translateX(-50%) rotate(${rotationAngle}deg); transform-origin: bottom center; transition: transform 0.4s ease; pointer-events: none;">
                    <div style="position: absolute; bottom: 0; left: calc(50% - 1px); width: 2px; height: 24px; background: var(--text-main); border-radius: 1px;"></div>
                </div>
            </div>
            <div style="display: flex; justify-content: space-between; width: 100%; font-size: 9px; color: var(--text-muted); padding: 0 2px;">
                <span>0</span><span>${max}</span>
            </div>
        </div>
    `;
}

function renderBeers(beersToRender) {
    const container = document.getElementById('beer-container');
    container.innerHTML = '';

    if (!beersToRender || beersToRender.length === 0) {
        container.innerHTML = `<div style="padding: 30px; text-align: center; color: var(--text-muted);">No beers found matching your criteria.</div>`;
        return;
    }

    beersToRender.forEach(beer => {
        const srmColor = srmToHex(beer.srm, beer.beer_style);
        const glasswareSvg = getGlasswareSvg(beer.beer_style, srmColor);
        const rankVal = beer.rank !== null && beer.rank !== undefined ? parseFloat(beer.rank) : 0;
        const rankColor = getRankColor(rankVal);

        let starsHtml = '';
        for (let i = 1; i <= 5; i++) {
            const opacity = i <= Math.round(rankVal) ? '1' : '0.25';
            starsHtml += `<span style="color: ${rankColor}; opacity: ${opacity}; font-size: 14px;">★</span>`;
        }

        const row = document.createElement('div');
        row.className = 'beer-row';
        row.dataset.id = beer.id;
        row.dataset.beerNumber = beer.beer_number;
        row.style.cursor = 'pointer';

        row.innerHTML = `
            <div class="col-action"><span class="badge-id" style="background: rgba(59, 130, 246, 0.1); color: #3b82f6; padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: 600;">#${beer.beer_number ?? '--'}</span></div>
            <div class="col-icon">${glasswareSvg}</div>
            <div class="col-name beer-info">
                <div class="beer-name" style="font-weight: 600; color: var(--text-main);">${beer.beer_name || 'Unknown Beer'}</div>
                <div class="brewery-name" style="font-size: 13px; color: var(--text-muted);">${beer.brewery_name || 'Unknown Brewery'}</div>
            </div>
            <div class="col-style" style="color: var(--text-muted);">${beer.beer_style || '--'}</div>
            <div class="col-location">
                <div style="display: flex; align-items: center; gap: 8px;">
                    ${getCountryFlagImg(beer.country)}
                    <div>
                        <div style="font-weight: 600; color: var(--text-main);">${beer.country || '--'}</div>
                        ${beer.state ? `<div style="font-size: 12px; color: var(--text-muted);">${beer.state}</div>` : ''}
                    </div>
                </div>
            </div>
            <div class="col-rank">
                <div style="display: flex; flex-direction: column; align-items: flex-start; gap: 2px;">
                    <div style="display: flex; gap: 1px;">${starsHtml}</div>
                    <span style="font-size: 11px; font-weight: 600; color: ${rankColor};">${rankVal > 0 ? rankVal.toFixed(1) : '--'}</span>
                </div>
            </div>
            <div class="col-abv">${createGaugeHtml(beer.abv, 15, getAbvPercentileColor(beer.abv), 'abv')}</div>
            <div class="col-ibu">${createGaugeHtml(beer.ibu, 100, getIbuPercentileColor(beer.ibu), 'ibu')}</div>
        `;
        container.appendChild(row);
    });
}

function getCountryFlagImg(countryName) {
    if (!countryName) return '';
    const name = countryName.trim().toUpperCase();
    const codeMap = {
        'USA': 'us', 'UNITED STATES': 'us', 'US': 'us', 'AMERICA': 'us',
        'CANADA': 'ca', 'CA': 'ca', 'UNITED KINGDOM': 'gb', 'UK': 'gb',
        'GERMANY': 'de', 'BELGIUM': 'be', 'MEXICO': 'mx', 'NETHERLANDS': 'nl',
        'FRANCE': 'fr', 'ITALY': 'it', 'SPAIN': 'es', 'AUSTRALIA': 'au',
        'IRELAND': 'ie', 'JAPAN': 'jp', 'CHINA': 'cn', 'SOUTH AFRICA': 'za'
    };
    const code = codeMap[name] || name.toLowerCase();
    if (code.length !== 2) return '';
    return `<img src="https://flagcdn.com/24x18/${code}.png" width="20" height="15" alt="${countryName}" style="border-radius: 2px; object-fit: cover; display: block;" />`;
}

// Modal helpers & form logic
function setStarRating(val, isHalf) {
    const numericInput = document.getElementById('new-rank');
    const numericDisplay = document.getElementById('rank-numeric-display');
    const starContainer = document.getElementById('star-container');
    const halfBtn = document.getElementById('half-star-btn');
    
    let totalVal = val + (isHalf ? 0.5 : 0);
    if (totalVal < 0) totalVal = 0;
    if (totalVal > 5) totalVal = 5;
    
    if (numericInput) numericInput.value = totalVal > 0 ? totalVal : '';
    if (numericDisplay) numericDisplay.textContent = totalVal > 0 ? totalVal.toFixed(1) : '--';
    
    // Toggle active blue styling on the single +.5 button
    if (halfBtn) {
        if (isHalf) {
            halfBtn.style.background = 'rgba(59, 130, 246, 0.2)';
            halfBtn.style.color = '#3b82f6';
            halfBtn.style.borderColor = '#3b82f6';
        } else {
            halfBtn.style.background = 'rgba(255, 255, 255, 0.05)';
            halfBtn.style.color = 'var(--text-muted)';
            halfBtn.style.borderColor = 'rgba(255, 255, 255, 0.15)';
        }
    }
    
    if (starContainer) {
        let starsHtml = '';
        for (let i = 1; i <= 5; i++) {
            if (i <= Math.floor(totalVal)) {
                starsHtml += `<span style="color: #3b82f6;">★</span>`;
            } else if (i === Math.ceil(totalVal) && totalVal % 1 !== 0) {
                starsHtml += `<span style="position: relative; display: inline-block; color: rgba(255,255,255,0.25);">★<span style="position: absolute; top: 0; left: 0; overflow: hidden; width: 50%; color: #3b82f6;">★</span></span>`;
            } else {
                starsHtml += `<span style="color: rgba(255,255,255,0.25);">★</span>`;
            }
        }
        starContainer.innerHTML = starsHtml;
    }
}

async function populateModalMetadata() {
    const dateInput = document.getElementById('new-consumption-date');
    if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }

    const badgePreview = document.getElementById('modal-badge-preview');
    if (badgePreview) {
        try {
            const res = await fetch('/api/beers?limit=1');
            const data = await res.json();
            const nextBadge = (data.total || 10000) + 1;
            badgePreview.textContent = `#${nextBadge}`;
        } catch (e) {
            badgePreview.textContent = `#--`;
        }
    }

    // Load unique breweries mapping
    try {
        const res = await fetch('/api/beers?action=breweries');
        const data = await res.json();
        breweryDatabaseMap = {};
        if (data.breweries) {
            data.breweries.forEach(b => {
                if (b.brewery_name) {
                    breweryDatabaseMap[b.brewery_name] = {
                        country: b.country || '',
                        state: b.state || ''
                    };
                }
            });
        }
    } catch (e) {
        console.error('Error fetching breweries list:', e);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    fetchBeers(1);

    document.getElementById('prev-btn').addEventListener('click', () => {
        if (currentPage > 1) fetchBeers(currentPage - 1);
    });

    document.getElementById('next-btn').addEventListener('click', () => {
        fetchBeers(currentPage + 1);
    });

    const searchInput = document.getElementById('search-input');
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        currentSearch = e.target.value.trim();
        searchTimeout = setTimeout(() => fetchBeers(1), 300);
    });

    document.getElementById('style-filter').addEventListener('change', (e) => {
        currentStyle = e.target.value;
        fetchBeers(1);
    });

    document.getElementById('sort-select').addEventListener('change', (e) => {
        currentSort = e.target.value;
        fetchBeers(1);
    });

    // Modal elements setup
    const modal = document.getElementById('add-beer-modal');
    const closeBtn = document.getElementById('close-modal-btn');
    const form = document.getElementById('quick-beer-form');
    const topAddButton = Array.from(document.querySelectorAll('button')).find(el => el.textContent.includes('Add New Beer'));
    const breweryInput = document.getElementById('new-brewery');
    const beerNameInput = document.getElementById('new-beer-name');
    const suggestionsBox = document.getElementById('brewery-suggestions');
    const tastingNotesInput = document.getElementById('new-tasting-notes');

    let successBanner = document.getElementById('beer-success-banner');
    if (modal && !successBanner) {
        successBanner = document.createElement('div');
        successBanner.id = 'beer-success-banner';
        successBanner.style.cssText = "display: none; margin-bottom: 12px; padding: 10px 14px; background: #065f46; color: #d1fae5; border: 1px solid #10b981; border-radius: 6px; font-size: 13px; font-weight: 500; text-align: center;";
        modal.querySelector('.modal-content, form, div')?.prepend(successBanner);
    }

    if (tastingNotesInput && !document.getElementById('tasting-notes-wrapper')) {
        const wrapper = document.createElement('div');
        wrapper.id = 'tasting-notes-wrapper';
        tastingNotesInput.parentNode.insertBefore(wrapper, tastingNotesInput);

        const label = document.createElement('div');
        label.style.cssText = "font-size: 12px; color: #9ca3af; margin-bottom: 6px;";
        label.textContent = "Common Notes (click to select):";
        wrapper.appendChild(label);

        const chipsContainer = document.createElement('div');
        chipsContainer.id = 'tasting-chips-container';
        chipsContainer.style.cssText = "display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 8px;";
        
        const commonNotes = ['Citrusy', 'Piney', 'Fruity', 'Malty', 'Roasty', 'Crisp', 'Hoppy', 'Smooth', 'Floral', 'Juicy', 'Dank', 'Alcohol'].sort();
        
        commonNotes.forEach(note => {
            const chip = document.createElement('div');
            chip.className = 'tasting-chip';
            chip.dataset.note = note;
            chip.dataset.selected = "false";
            chip.style.cssText = "display: flex; align-items: center; justify-content: center; gap: 4px; padding: 5px 4px; font-size: 11px; font-weight: 500; background: #1f2937; color: #9ca3af; border: 1px solid #374151; border-radius: 6px; cursor: pointer; user-select: none; transition: all 0.2s; white-space: nowrap;";
            chip.innerHTML = `<span style="font-size: 9px;">☐</span> ${note}`;
            
            chip.addEventListener('click', () => {
                const isSelected = chip.dataset.selected === "true";
                if (isSelected) {
                    chip.dataset.selected = "false";
                    chip.style.background = '#1f2937';
                    chip.style.color = '#9ca3af';
                    chip.style.borderColor = '#374151';
                    chip.innerHTML = `<span style="font-size: 9px;">☐</span> ${note}`;
                } else {
                    chip.dataset.selected = "true";
                    chip.style.background = '#1e3a8a';
                    chip.style.color = '#93c5fd';
                    chip.style.borderColor = '#3b82f6';
                    chip.innerHTML = `<span style="font-size: 9px;">☑</span> ${note}`;
                }
            });
            chipsContainer.appendChild(chip);
        });
        wrapper.appendChild(chipsContainer);
        wrapper.appendChild(tastingNotesInput); 
        tastingNotesInput.placeholder = "Additional custom notes (optional)...";
    }

    if (topAddButton) {
        topAddButton.addEventListener('click', () => {
            modal.style.display = 'flex';
            if (successBanner) successBanner.style.display = 'none';
            populateModalMetadata();
            setStarRating(0, false); // Reset stars to unselected
            document.querySelectorAll('.tasting-chip').forEach(chip => {
                chip.dataset.selected = "false";
                chip.style.background = '#1f2937';
                chip.style.color = '#9ca3af';
                chip.style.borderColor = '#374151';
                chip.innerHTML = `<span style="font-size: 9px;">☐</span> ${chip.dataset.note}`;
            });
            if (breweryInput) breweryInput.focus();
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
            if (suggestionsBox) suggestionsBox.style.display = 'none';
            if (successBanner) successBanner.style.display = 'none';
            if (form) form.reset();
            setStarRating(0, false);
        });
    }

    // Brewery suggestions & auto-population
    if (breweryInput && suggestionsBox) {
        breweryInput.addEventListener('input', (e) => {
            const query = e.target.value.trim().toLowerCase();
            const exactVal = e.target.value.trim();
            const countryEl = document.getElementById('new-country');
            const stateEl = document.getElementById('new-state');

            if (breweryDatabaseMap[exactVal]) {
                if (countryEl) countryEl.value = breweryDatabaseMap[exactVal].country || '';
                if (stateEl) stateEl.value = breweryDatabaseMap[exactVal].state || '';
            } else {
                if (countryEl) countryEl.value = '';
                if (stateEl) stateEl.value = '';
            }

            suggestionsBox.innerHTML = '';
            if (!query) {
                suggestionsBox.style.display = 'none';
                return;
            }

            const matches = Object.keys(breweryDatabaseMap).filter(b => b.toLowerCase().includes(query));
            if (matches.length > 0) {
                suggestionsBox.style.display = 'block';
                matches.slice(0, 50).forEach(matchName => {
                    const div = document.createElement('div');
                    div.style.cssText = "padding: 10px 12px; font-size: 13px; color: #e5e7eb; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.05); background: #111827;";
                    div.textContent = matchName;
                    
                    div.addEventListener('mousedown', (ev) => {
                        ev.preventDefault();
                        breweryInput.value = matchName;
                        if (countryEl) countryEl.value = breweryDatabaseMap[matchName].country || '';
                        if (stateEl) stateEl.value = breweryDatabaseMap[matchName].state || '';
                        suggestionsBox.style.display = 'none';
                    });
                    
                    div.addEventListener('mouseenter', () => div.style.background = 'rgba(59, 130, 246, 0.2)');
                    div.addEventListener('mouseleave', () => div.style.background = '#111827');
                    
                    suggestionsBox.appendChild(div);
                });
            } else {
                suggestionsBox.style.display = 'none';
            }
        });

        document.addEventListener('click', (e) => {
            if (!breweryInput.contains(e.target) && !suggestionsBox.contains(e.target)) {
                suggestionsBox.style.display = 'none';
            }
        });
    }

    // Star Container & Half-point handler
    const starContainer = document.getElementById('star-container');
    const numericDisplay = document.getElementById('rank-numeric-display');
    const halfBtn = document.getElementById('half-star-btn');

    if (halfBtn) {
        halfBtn.addEventListener('click', () => {
            const currentVal = parseFloat(document.getElementById('new-rank')?.value) || 0;
            let baseVal = Math.floor(currentVal);
            if (baseVal === 0) baseVal = 1;
            let newVal = (currentVal % 1 === 0.5) ? baseVal : Math.min(5, baseVal + 0.5);
            setStarRating(baseVal, newVal % 1 === 0.5);
        });
    }

    if (starContainer && numericDisplay) {
        starContainer.addEventListener('click', (e) => {
            const stars = starContainer.querySelectorAll('span');
            stars.forEach((star, index) => {
                const rect = star.getBoundingClientRect();
                if (e.clientX >= rect.left && e.clientX <= rect.right) {
                    const selectedWhole = index + 1;
                    const currentVal = parseFloat(document.getElementById('new-rank')?.value) || 0;
                    const hasHalf = currentVal % 1 === 0.5;
                    setStarRating(selectedWhole, hasHalf);
                }
            });
        });
    }

    // Form Submission Handler
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const selectedChips = Array.from(document.querySelectorAll('.tasting-chip'))
                .filter(chip => chip.dataset.selected === "true")
                .map(chip => chip.dataset.note);
            
            const customNotes = document.getElementById('new-tasting-notes').value.trim();
            const allNotes = [...selectedChips];
            if (customNotes) allNotes.push(customNotes);
            const finalTastingNotes = allNotes.join(', ');

            const badgeText = document.getElementById('modal-badge-preview').textContent.replace('#', '');
            const payload = {
                beer_number: !isNaN(badgeText) ? parseInt(badgeText) : null,
                brewery_name: document.getElementById('new-brewery').value.trim(),
                beer_name: document.getElementById('new-beer-name').value.trim(),
                country: document.getElementById('new-country').value.trim() || null,
                state: document.getElementById('new-state').value.trim() || null,
                rank: parseFloat(document.getElementById('new-rank').value) || null,
                tasting_notes: finalTastingNotes || null,
                consumption_date: document.getElementById('new-consumption-date').value || null
            };

            try {
                const response = await fetch('/api/beers', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const result = await response.json();

                if (response.ok) {
                    if (successBanner) {
                        successBanner.textContent = '🍺 Beer successfully logged to database!';
                        successBanner.style.display = 'block';
                    }

                    setTimeout(() => {
                        modal.style.display = 'none';
                        if (successBanner) successBanner.style.display = 'none';
                        form.reset();
                        fetchBeers(1);
                    }, 900);
                } else {
                    alert('Error saving beer: ' + (result.error || 'Unknown error'));
                }
            } catch (err) {
                console.error('Network submission error:', err);
                alert('Failed to connect to server while saving beer.');
            }
        });
    }
});