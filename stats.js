// Supabase Settings
const SUPABASE_URL = 'https://acjxhufnotvweoeoccvt.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjanhodWZub3R2d2VvZW9jY3Z0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxODE2MjQsImV4cCI6MjA4NTc1NzYyNH0.TF79yXwg9T8sThhfw4P9vvb9iWY9qkzUVh6t-_v38iA';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let allDeceased = [];

// Load and display statistics
async function loadStatistics() {
    console.log('📊 Loading statistics...');
    
    // Fetch all death records
    const { data, error } = await supabaseClient
        .from('death')
        .select('*');
    
    if (error) {
        console.error('Error loading data:', error);
        alert('خطأ في تحميل البيانات');
        return;
    }
    
    allDeceased = data;
    console.log(`✅ Loaded ${allDeceased.length} records`);
    
    // Calculate and display statistics
    displaySummaryStats();
    displayGenderDistribution();
    displayAgeDistribution();
    displayDeathsByDecade();
    displayDeathsByYear();
    displayDeathsByFamilyName();
    
    // Hide loading screen
    document.getElementById('loadingScreen').style.display = 'none';
    document.getElementById('statsContent').style.display = 'block';
}

// Display summary statistics
function displaySummaryStats() {
    const total = allDeceased.length;
    const males = allDeceased.filter(p => p.gender === 'male').length;
    const females = allDeceased.filter(p => p.gender === 'female').length;
    
    // Calculate average age
    const agesWithData = allDeceased.filter(p => p.birth_date && p.death_date).map(p => {
        const birth = new Date(p.birth_date);
        const death = new Date(p.death_date);
        return death.getFullYear() - birth.getFullYear();
    });
    
    const avgAge = agesWithData.length > 0 
        ? Math.round(agesWithData.reduce((a, b) => a + b, 0) / agesWithData.length) 
        : 0;
    
    // Animate numbers
    animateNumber('totalDeaths', total);
    animateNumber('totalMales', males);
    animateNumber('totalFemales', females);
    animateNumber('avgAge', avgAge);
}

// Display gender distribution with a single pie chart
function displayGenderDistribution() {
    const males = allDeceased.filter(p => p.gender === 'male').length;
    const females = allDeceased.filter(p => p.gender === 'female').length;
    const total = allDeceased.length;
    
    const malePercent = total > 0 ? Math.round((males / total) * 100) : 0;
    const femalePercent = total > 0 ? Math.round((females / total) * 100) : 0;
    
    // Update text displays
    document.getElementById('malePercent').textContent = `${malePercent}%`;
    document.getElementById('femalePercent').textContent = `${femalePercent}%`;
    document.getElementById('maleCount').textContent = males;
    document.getElementById('femaleCount').textContent = females;
    document.getElementById('totalCount').textContent = total;
    
    // Create pie chart segments
    const cx = 100;
    const cy = 100;
    const radius = 80;
    
    // Calculate angles (in radians)
    const maleAngle = (males / total) * 2 * Math.PI;
    const femaleAngle = (females / total) * 2 * Math.PI;
    
    // Helper function to create arc path
    function createArcPath(startAngle, endAngle) {
        const x1 = cx + radius * Math.cos(startAngle);
        const y1 = cy + radius * Math.sin(startAngle);
        const x2 = cx + radius * Math.cos(endAngle);
        const y2 = cy + radius * Math.sin(endAngle);
        
        const largeArcFlag = endAngle - startAngle > Math.PI ? 1 : 0;
        
        return `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
    }
    
    // Female segment (starts from top, going clockwise)
    const femaleStart = -Math.PI / 2; // Start from top (-90 degrees)
    const femaleEnd = femaleStart + femaleAngle;
    
    // Male segment (continues after female)
    const maleStart = femaleEnd;
    const maleEnd = maleStart + maleAngle;
    
    // Animate the segments
    setTimeout(() => {
        if (females > 0) {
            document.getElementById('femaleSegment').setAttribute('d', createArcPath(femaleStart, femaleEnd));
        }
        if (males > 0) {
            document.getElementById('maleSegment').setAttribute('d', createArcPath(maleStart, maleEnd));
        }
    }, 300);
}

// Display age distribution
function displayAgeDistribution() {
    const ageGroups = {
        '0-18': { 
            label: 'أطفال وشباب (0-18)', 
            count: 0, 
            icon: '<svg class="w-5 h-5 text-blue-500 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
        },
        '19-40': { 
            label: 'شباب (19-40)', 
            count: 0, 
            icon: '<svg class="w-5 h-5 text-green-500 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>'
        },
        '41-65': { 
            label: 'كبار (41-65)', 
            count: 0, 
            icon: '<svg class="w-5 h-5 text-orange-500 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
        },
        '66+': { 
            label: 'مسنين (66+)', 
            count: 0, 
            icon: '<svg class="w-5 h-5 text-purple-500 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/><path stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" d="M6.343 17.657A8 8 0 0112 16"/></svg>'
        }
    };
    
    allDeceased.forEach(person => {
        if (person.birth_date && person.death_date) {
            const birth = new Date(person.birth_date);
            const death = new Date(person.death_date);
            const age = death.getFullYear() - birth.getFullYear();
            
            if (age >= 0 && age <= 18) ageGroups['0-18'].count++;
            else if (age >= 19 && age <= 40) ageGroups['19-40'].count++;
            else if (age >= 41 && age <= 65) ageGroups['41-65'].count++;
            else if (age >= 66) ageGroups['66+'].count++;
        }
    });
    
    const total = Object.values(ageGroups).reduce((sum, g) => sum + g.count, 0);
    const container = document.getElementById('ageDistribution');
    
    container.innerHTML = Object.entries(ageGroups).map(([key, group]) => {
        const percent = total > 0 ? Math.round((group.count / total) * 100) : 0;
        return `
            <div class="mb-2 md:mb-3">
                <div class="flex items-center justify-between mb-1 md:mb-2">
                    <span class="text-gray-700 text-sm md:text-base font-semibold chart-label flex items-center gap-2">${group.icon} <span>${group.label}</span></span>
                    <span class="text-purple-600 text-sm md:text-base font-bold">${group.count} (${percent}%)</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2 md:h-3">
                    <div class="chart-bar h-2 md:h-3 rounded-full" style="width: 0%; transition: width 1s ease-out;" data-width="${percent}%"></div>
                </div>
            </div>
        `;
    }).join('');
    
    // Animate bars
    setTimeout(() => {
        container.querySelectorAll('.chart-bar').forEach(bar => {
            bar.style.width = bar.dataset.width;
        });
    }, 300);
}

// Display deaths by decade
function displayDeathsByDecade() {
    const decades = {};
    
    allDeceased.forEach(person => {
        if (person.death_date) {
            const year = new Date(person.death_date).getFullYear();
            const decade = Math.floor(year / 10) * 10;
            const decadeLabel = `${decade}s`;
            decades[decadeLabel] = (decades[decadeLabel] || 0) + 1;
        }
    });
    
    const sortedDecades = Object.entries(decades).sort((a, b) => b[0].localeCompare(a[0]));
    const maxCount = Math.max(...Object.values(decades));
    const container = document.getElementById('deathsByDecade');
    
    container.innerHTML = sortedDecades.map(([decade, count]) => {
        const percent = (count / maxCount) * 100;
        return `
            <div class="flex items-center gap-2 md:gap-4">
                <div class="w-16 md:w-24 text-right text-sm md:text-base font-bold text-gray-700 year-label">${decade}</div>
                <div class="flex-1 bg-gray-200 rounded-full h-6 md:h-8 overflow-hidden">
                    <div class="chart-bar h-6 md:h-8 flex items-center px-2 md:px-4 text-white font-bold" 
                         style="width: 0%; transition: width 1s ease-out;" 
                         data-width="${percent}%">
                        <span class="text-xs md:text-sm">${count}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // Animate bars
    setTimeout(() => {
        container.querySelectorAll('.chart-bar').forEach(bar => {
            bar.style.width = bar.dataset.width;
        });
    }, 300);
}

// Display deaths by year
function displayDeathsByYear() {
    const years = {};
    
    allDeceased.forEach(person => {
        if (person.death_date) {
            const year = new Date(person.death_date).getFullYear();
            years[year] = (years[year] || 0) + 1;
        }
    });
    
    // Sort by year descending (latest first)
    const sortedYears = Object.entries(years).sort((a, b) => b[0] - a[0]);
    const maxCount = Math.max(...Object.values(years));
    const container = document.getElementById('deathsByYear');
    
    container.innerHTML = sortedYears.map(([year, count]) => {
        const percent = (count / maxCount) * 100;
        return `
            <div class="flex items-center gap-2 md:gap-4">
                <div class="w-16 md:w-24 text-right text-sm md:text-base font-bold text-gray-700 year-label">${year}</div>
                <div class="flex-1 bg-gray-200 rounded-full h-6 md:h-8 overflow-hidden">
                    <div class="chart-bar h-6 md:h-8 flex items-center px-2 md:px-4 text-white font-bold" 
                         style="width: 0%; transition: width 1s ease-out;" 
                         data-width="${percent}%">
                        <span class="text-xs md:text-sm">${count}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // Animate bars
    setTimeout(() => {
        container.querySelectorAll('.chart-bar').forEach(bar => {
            bar.style.width = bar.dataset.width;
        });
    }, 300);
}

// Display deaths by family name
function displayDeathsByFamilyName() {
    const families = {};
    
    allDeceased.forEach(person => {
        if (person.last_name) {
            const familyName = person.last_name.trim();
            families[familyName] = (families[familyName] || 0) + 1;
        }
    });
    
    // Sort by count descending (highest first)
    const sortedFamilies = Object.entries(families).sort((a, b) => b[1] - a[1]);
    const maxCount = Math.max(...Object.values(families));
    const container = document.getElementById('deathsByFamily');
    
    container.innerHTML = sortedFamilies.map(([familyName, count]) => {
        const percent = (count / maxCount) * 100;
        return `
            <div class="flex items-center gap-2 md:gap-4">
                <div class="w-20 md:w-32 text-right text-sm md:text-base font-bold text-gray-700 family-label truncate">${familyName}</div>
                <div class="flex-1 bg-gray-200 rounded-full h-6 md:h-8 overflow-hidden">
                    <div class="chart-bar h-6 md:h-8 flex items-center px-2 md:px-4 text-white font-bold" 
                         style="width: 0%; transition: width 1s ease-out;" 
                         data-width="${percent}%">
                        <span class="text-xs md:text-sm">${count}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // Animate bars
    setTimeout(() => {
        container.querySelectorAll('.chart-bar').forEach(bar => {
            bar.style.width = bar.dataset.width;
        });
    }, 300);
}

// Animate number counting
function animateNumber(elementId, targetValue) {
    const element = document.getElementById(elementId);
    const duration = 1500;
    const startValue = 0;
    const startTime = Date.now();
    
    const animate = () => {
        const currentTime = Date.now();
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const currentValue = Math.floor(startValue + (targetValue - startValue) * easeOutQuart);
        
        element.textContent = currentValue;
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            element.textContent = targetValue;
        }
    };
    
    animate();
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    loadStatistics();
});
