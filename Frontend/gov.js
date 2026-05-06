// Comprehensive District List for India
const stateDistricts = {
  "Andhra Pradesh": ["Alluri Sitharama Raju", "Anakapalli", "Ananthapuramu", "Annamayya", "Bapatla", "Chittoor", "Dr. B.R. Ambedkar Konaseema", "East Godavari", "Eluru", "Guntur", "Kakinada", "Krishna", "Kurnool", "Nandyal", "NTR", "Palnadu", "Parvathipuram Manyam", "Prakasam", "Sri Potti Sriramulu Nellore", "Sri Sathya Sai", "Srikakulam", "Tirupati", "Visakhapatnam", "Vizianagaram", "West Godavari", "Y.S.R. Kadapa"],
  "Arunachal Pradesh": ["Anjaw", "Changlang", "Dibang Valley", "East Kameng", "East Siang", "Itanagar Capital Complex", "Kamle", "Kra Daadi", "Kurung Kumey", "Lepa Rada", "Lohit", "Longding", "Lower Dibang Valley", "Lower Siang", "Lower Subansiri", "Namsai", "Pakke Kessang", "Papum Pare", "Shi Yomi", "Siang", "Tawang", "Tirap", "Upper Siang", "Upper Subansiri", "West Kameng", "West Siang"],
  "Assam": ["Baksa", "Barpeta", "Biswanath", "Bongaigaon", "Cachar", "Charaideo", "Chirang", "Darrang", "Dhemaji", "Dhubri", "Dibrugarh", "Dima Hasao", "Goalpara", "Golaghat", "Hailakandi", "Hojai", "Jorhat", "Kamrup", "Kamrup Metropolitan", "Karbi Anglong", "Karimganj", "Kokrajhar", "Lakhimpur", "Majuli", "Morigaon", "Nagaon", "Nalbari", "Sivasagar", "Sonitpur", "South Salmara-Mankachar", "Tinsukia", "Udalguri", "West Karbi Anglong"],
  "Bihar": ["Araria", "Arwal", "Aurangabad", "Banka", "Begusarai", "Bhagalpur", "Bhojpur", "Buxar", "Darbhanga", "East Champaran", "Gaya", "Gopalganj", "Jamui", "Jehanabad", "Kaimur", "Katihar", "Khagaria", "Kishanganj", "Lakhisarai", "Madhepura", "Madhubani", "Munger", "Muzaffarpur", "Nalanda", "Nawada", "Patna", "Purnia", "Rohtas", "Saharsa", "Samastipur", "Saran", "Sheikhpura", "Sheohar", "Sitamarhi", "Siwan", "Supaul", "Vaishali", "West Champaran"],
  "Chhattisgarh": ["Balod", "Baloda Bazar", "Balrampur", "Bastar", "Bemetara", "Bijapur", "Bilaspur", "Dantewada", "Dhamtari", "Durg", "Gariaband", "Janjgir-Champa", "Jashpur", "Kabirdham", "Kanker", "Kondagaon", "Korba", "Koriya", "Mahasamund", "Mungeli", "Narayanpur", "Raigarh", "Raipur", "Rajnandgaon", "Sukma", "Surajpur", "Surguja"],
  "Goa": ["North Goa", "South Goa"],
  "Gujarat": ["Ahmedabad", "Amreli", "Anand", "Aravalli", "Banaskantha", "Bharuch", "Bhavnagar", "Botad", "Chhota Udaipur", "Dahod", "Dang", "Devbhoomi Dwarka", "Gandhinagar", "Gir Somnath", "Jamnagar", "Junagadh", "Kheda", "Kutch", "Mahisagar", "Mehsana", "Morbi", "Narmada", "Navsari", "Panchmahal", "Patan", "Porbandar", "Rajkot", "Sabarkantha", "Surat", "Surendranagar", "Tapi", "Vadodara", "Valsad"],
  "Haryana": ["Ambala", "Bhiwani", "Charkhi Dadri", "Faridabad", "Fatehabad", "Gurugram", "Hisar", "Jhajjar", "Jind", "Kaithal", "Karnal", "Kurukshetra", "Mahendragarh", "Nuh", "Palwal", "Panchkula", "Panipat", "Rewari", "Rohtak", "Sirsa", "Sonipat", "Yamunanagar"],
  "Himachal Pradesh": ["Bilaspur", "Chamba", "Hamirpur", "Kangra", "Kinnaur", "Kullu", "Lahaul and Spiti", "Mandi", "Shimla", "Sirmaur", "Solan", "Una"],
  "Jharkhand": ["Bokaro", "Chatra", "Deoghar", "Dhanbad", "Dumka", "East Singhbhum", "Garhwa", "Giridih", "Godda", "Gumla", "Hazaribagh", "Jamtara", "Khunti", "Koderma", "Latehar", "Lohardaga", "Pakur", "Palamu", "Ramgarh", "Ranchi", "Sahibganj", "Saraikela Kharsawan", "Simdega", "West Singhbhum"],
  "Karnataka": ["Bagalkot", "Ballari", "Belagavi", "Bengaluru Rural", "Bengaluru Urban", "Bidar", "Chamarajanagar", "Chikkaballapur", "Chikkamagaluru", "Chitradurga", "Dakshina Kannada", "Davanagere", "Dharwad", "Gadag", "Hassan", "Haveri", "Kalaburagi", "Kodagu", "Kolar", "Koppal", "Mandya", "Mysuru", "Raichur", "Ramanagara", "Shivamogga", "Tumakuru", "Udupi", "Uttara Kannada", "Vijayapura", "Yadgir"],
  "Kerala": ["Alappuzha", "Ernakulam", "Idukki", "Kannur", "Kasaragod", "Kollam", "Kottayam", "Kozhikode", "Malappuram", "Palakkad", "Pathanamthitta", "Thiruvananthapuram", "Thrissur", "Wayanad"],
  "Madhya Pradesh": ["Agar Malwa", "Alirajpur", "Anuppur", "Ashoknagar", "Balaghat", "Barwani", "Betul", "Bhind", "Bhopal", "Burhanpur", "Chhatarpur", "Chhindwara", "Damoh", "Datia", "Dewas", "Dhar", "Dindori", "Guna", "Gwalior", "Harda", "Hoshangabad", "Indore", "Jabalpur", "Jhabua", "Katni", "Khandwa", "Khargone", "Mandla", "Mandsaur", "Morena", "Narsinghpur", "Neemuch", "Panna", "Raisen", "Rajgarh", "Ratlam", "Rewa", "Sagar", "Satna", "Sehore", "Seoni", "Shahdol", "Shajapur", "Sheopur", "Shivpuri", "Sidhi", "Singrauli", "Tikamgarh", "Ujjain", "Umaria", "Vidisha"],
  "Maharashtra": ["Ahmednagar", "Akola", "Amravati", "Aurangabad", "Beed", "Bhandara", "Buldhana", "Chandrapur", "Dhule", "Gadchiroli", "Gondia", "Hingoli", "Jalgaon", "Jalna", "Kolhapur", "Latur", "Mumbai City", "Mumbai Suburban", "Nagpur", "Nanded", "Nandurbar", "Nashik", "Osmanabad", "Palghar", "Parbhani", "Pune", "Raigad", "Ratnagiri", "Sangli", "Satara", "Sindhudurg", "Solapur", "Thane", "Wardha", "Washim", "Yavatmal"],
  "Manipur": ["Bishnupur", "Chandel", "Churachandpur", "Imphal East", "Imphal West", "Jiribam", "Kakching", "Kamjong", "Kangpokpi", "Noney", "Pherzawl", "Senapati", "Tamenglong", "Tengnoupal", "Thoubal", "Ukhrul"],
  "Meghalaya": ["East Garo Hills", "East Jaintia Hills", "East Khasi Hills", "North Garo Hills", "Ri Bhoi", "South Garo Hills", "South West Garo Hills", "South West Khasi Hills", "West Garo Hills", "West Jaintia Hills", "West Khasi Hills"],
  "Mizoram": ["Aizawl", "Champhai", "Kolasib", "Lawngtlai", "Lunglei", "Mamit", "Saiha", "Serchhip"],
  "Nagaland": ["Chumukedima", "Dimapur", "Kiphire", "Kohima", "Longleng", "Mokokchung", "Mon", "Niuland", "Noklak", "Peren", "Phek", "Tuensang", "Wokha", "Zunheboto"],
  "Odisha": ["Angul", "Balangir", "Balasore", "Bargarh", "Bhadrak", "Boudh", "Cuttack", "Deogarh", "Dhenkanal", "Gajapati", "Ganjam", "Jagatsinghpur", "Jajpur", "Jharsuguda", "Kalahandi", "Kandhamal", "Kendrapara", "Kendujhar", "Khordha", "Koraput", "Malkangiri", "Mayurbhanj", "Nabarangpur", "Nayagarh", "Nuapada", "Puri", "Rayagada", "Sambalpur", "Subarnapur", "Sundargarh"],
  "Punjab": ["Amritsar", "Barnala", "Bathinda", "Faridkot", "Fatehgarh Sahib", "Fazilka", "Ferozepur", "Gurdaspur", "Hoshiarpur", "Jalandhar", "Kapurthala", "Ludhiana", "Mansa", "Moga", "Muktsar", "Pathankot", "Patiala", "Rupnagar", "Sahibzada Ajit Singh Nagar", "Sangrur", "Shahid Bhagat Singh Nagar", "Tarn Taran"],
  "Rajasthan": ["Ajmer", "Alwar", "Banswara", "Baran", "Barmer", "Bharatpur", "Bhilwara", "Bikaner", "Bundi", "Chittorgarh", "Churu", "Dausa", "Dholpur", "Dungarpur", "Hanumangarh", "Jaipur", "Jaisalmer", "Jalore", "Jhalawar", "Jhunjhunu", "Jodhpur", "Karauli", "Kota", "Nagaur", "Pali", "Pratapgarh", "Rajsamand", "Sawai Madhopur", "Sikar", "Sirohi", "Sri Ganganagar", "Tonk", "Udaipur"],
  "Sikkim": ["East Sikkim", "North Sikkim", "South Sikkim", "West Sikkim"],
  "Tamil Nadu": ["Ariyalur", "Chengalpattu", "Chennai", "Coimbatore", "Cuddalore", "Dharmapuri", "Dindigul", "Erode", "Kallakurichi", "Kanchipuram", "Kanyakumari", "Karur", "Krishnagiri", "Madurai", "Mayiladuthurai", "Nagapattinam", "Namakkal", "Nilgiris", "Perambalur", "Pudukkottai", "Ramanathapuram", "Ranipet", "Salem", "Sivaganga", "Tenkasi", "Thanjavur", "Theni", "Thoothukudi", "Tiruchirappalli", "Tirunelveli", "Tirupattur", "Tiruppur", "Tiruvallur", "Tiruvannamalai", "Tiruvarur", "Vellore", "Viluppuram", "Virudhunagar"],
  "Telangana": ["Adilabad", "Bhadradri Kothagudem", "Hyderabad", "Jagtial", "Jangaon", "Jayashankar Bhupalpally", "Jogulamba Gadwal", "Kamareddy", "Karimnagar", "Khammam", "Komaram Bheem Asifabad", "Mahabubabad", "Mahabubnagar", "Mancherial", "Medak", "Medchal-Malkajgiri", "Mulugu", "Nagarkurnool", "Nalgonda", "Narayanpet", "Nirmal", "Nizamabad", "Peddapalli", "Rajanna Sircilla", "Rangareddy", "Sangareddy", "Siddipet", "Suryapet", "Vikarabad", "Wanaparthy", "Warangal", "Hanamkonda", "Yadadri Bhuvanagiri"],
  "Tripura": ["Dhalai", "Gomati", "Khowai", "North Tripura", "Sepahijala", "South Tripura", "Unakoti", "West Tripura"],
  "Uttar Pradesh": ["Agra", "Aligarh", "Ambedkar Nagar", "Amethi", "Amroha", "Auraiya", "Ayodhya", "Azamgarh", "Baghpat", "Bahraich", "Ballia", "Balrampur", "Banda", "Barabanki", "Bareilly", "Basti", "Bhadohi", "Bijnor", "Budaun", "Bulandshahr", "Chandauli", "Chitrakoot", "Deoria", "Etah", "Etawah", "Farrukhabad", "Fatehpur", "Firozabad", "Gautam Buddha Nagar", "Ghaziabad", "Ghazipur", "Gonda", "Gorakhpur", "Hamirpur", "Hapur", "Hardoi", "Hathras", "Jalaun", "Jaunpur", "Jhansi", "Kannauj", "Kanpur Dehat", "Kanpur Nagar", "Kasganj", "Kaushambi", "Kheri", "Kushinagar", "Lalitpur", "Lucknow", "Maharajganj", "Mahoba", "Mainpuri", "Mathura", "Mau", "Meerut", "Mirzapur", "Moradabad", "Muzaffarnagar", "Pilibhit", "Pratapgarh", "Prayagraj", "Raebareli", "Rampur", "Saharanpur", "Sambhal", "Sant Kabir Nagar", "Shahjahanpur", "Shamli", "Shravasti", "Siddharthnagar", "Sitapur", "Sonbhadra", "Sultanpur", "Unnao", "Varanasi"],
  "Uttarakhand": ["Almora", "Bageshwar", "Chamoli", "Champawat", "Dehradun", "Haridwar", "Nainital", "Pauri Garhwal", "Pithoragarh", "Rudraprayag", "Tehri Garhwal", "Udham Singh Nagar", "Uttarkashi"],
  "West Bengal": ["Alipurduar", "Bankura", "Birbhum", "Cooch Behar", "Dakshin Dinajpur", "Darjeeling", "Hooghly", "Howrah", "Jalpaiguri", "Jhargram", "Kalimpong", "Kolkata", "Malda", "Murshidabad", "Nadia", "North 24 Parganas", "Paschim Bardhaman", "Paschim Medinipur", "Purba Bardhaman", "Purba Medinipur", "Purulia", "South 24 Parganas", "Uttar Dinajpur"],
  "Andaman and Nicobar Islands": ["Nicobar", "North and Middle Andaman", "South Andaman"],
  "Chandigarh": ["Chandigarh"],
  "Dadra and Nagar Haveli and Daman and Diu": ["Dadra and Nagar Haveli", "Daman", "Diu"],
  "Delhi": ["Central Delhi", "East Delhi", "New Delhi", "North Delhi", "North East Delhi", "North West Delhi", "Shahdara", "South Delhi", "South East Delhi", "South West Delhi", "West Delhi"],
  "Jammu and Kashmir": ["Anantnag", "Bandipora", "Baramulla", "Budgam", "Doda", "Ganderbal", "Jammu", "Kathua", "Kishtwar", "Kulgam", "Kupwara", "Poonch", "Pulwama", "Rajouri", "Ramban", "Reasi", "Samba", "Shopian", "Srinagar", "Udhampur"],
  "Ladakh": ["Kargil", "Leh"],
  "Lakshadweep": ["Lakshadweep"],
  "Puducherry": ["Karaikal", "Mahe", "Puducherry", "Yanam"]
};

// Generate full geoData dynamically
const geoData = {};
Object.keys(stateDistricts).forEach(state => {
  geoData[state] = {};
  stateDistricts[state].forEach(dist => {
    geoData[state][dist] = {
      [`${dist} Urban Mandal`]: [`Shop 1 - ${dist} Main`, `Shop 2 - ${dist} East`, `Shop 3 - ${dist} West`, `Shop 4 - ${dist} Market`, `Shop 5 - ${dist} Station Road`],
      [`${dist} Rural Mandal`]: [`Shop 101 - Rural North`, `Shop 102 - Rural South`, `Shop 103 - Panchayat Area`, `Shop 104 - Village Outskirts`],
      [`${dist} Industrial Mandal`]: [`Shop 201 - Sector 1`, `Shop 202 - Sector 2`, `Shop 203 - Colony Area`]
    };
  });
});

document.addEventListener('DOMContentLoaded', () => {
  // Populate States initially
  const stateSelect = document.getElementById('gov-state');
  for (let state in geoData) {
    stateSelect.insertAdjacentHTML('beforeend', `<option value="${state}">${state}</option>`);
  }
  
  renderSupplyHistory();
});

window.updateGovHierarchy = function(level) {
  const stateSel = document.getElementById('gov-state').value;
  const distSel = document.getElementById('gov-district').value;
  const mandalSel = document.getElementById('gov-mandal').value;
  
  const distDropdown = document.getElementById('gov-district');
  const mandDropdown = document.getElementById('gov-mandal');
  const shopDropdown = document.getElementById('gov-shop');

  if (level === 'state') {
    // Reset lower levels
    distDropdown.innerHTML = '<option value="">Select District</option>';
    mandDropdown.innerHTML = '<option value="">Select Mandal</option>';
    shopDropdown.innerHTML = '<option value="">Select Shop</option>';
    mandDropdown.disabled = true;
    shopDropdown.disabled = true;
    
    if (stateSel && geoData[stateSel]) {
      distDropdown.disabled = false;
      for (let dist in geoData[stateSel]) {
        distDropdown.insertAdjacentHTML('beforeend', `<option value="${dist}">${dist}</option>`);
      }
    } else {
      distDropdown.disabled = true;
    }
  }
  
  else if (level === 'district') {
    mandDropdown.innerHTML = '<option value="">Select Mandal</option>';
    shopDropdown.innerHTML = '<option value="">Select Shop</option>';
    shopDropdown.disabled = true;
    
    if (stateSel && distSel && geoData[stateSel][distSel]) {
      mandDropdown.disabled = false;
      for (let mandal in geoData[stateSel][distSel]) {
        mandDropdown.insertAdjacentHTML('beforeend', `<option value="${mandal}">${mandal}</option>`);
      }
    } else {
      mandDropdown.disabled = true;
    }
  }
  
  else if (level === 'mandal') {
    shopDropdown.innerHTML = '<option value="">Select Shop</option>';
    
    if (stateSel && distSel && mandalSel && geoData[stateSel][distSel][mandalSel]) {
      shopDropdown.disabled = false;
      const shops = geoData[stateSel][distSel][mandalSel];
      shops.forEach(shop => {
        shopDropdown.insertAdjacentHTML('beforeend', `<option value="${shop}">${shop}</option>`);
      });
    } else {
      shopDropdown.disabled = true;
    }
  }
};

window.sendStockToDealer = function() {
  const shop = document.getElementById('gov-shop').value;
  if (!shop) {
    alert("Please select a specific Village Shop to dispatch stock to.");
    return;
  }
  
  const rice = parseInt(document.getElementById('supply-rice').value) || 0;
  const wheat = parseInt(document.getElementById('supply-wheat').value) || 0;
  const sugar = parseInt(document.getElementById('supply-sugar').value) || 0;
  const oil = parseInt(document.getElementById('supply-oil').value) || 0;
  const dal = parseInt(document.getElementById('supply-dal').value) || 0;
  const salt = parseInt(document.getElementById('supply-salt').value) || 0;
  const soap = parseInt(document.getElementById('supply-soap').value) || 0;
  
  if (rice + wheat + sugar + oil + dal + salt + soap === 0) {
    alert("Please enter at least one quantity greater than 0.");
    return;
  }

  const shipmentId = Date.now();

  // 1. Add to Pending Shipments for the Dealer to accept
  let pendingShipments = JSON.parse(localStorage.getItem('pendingShipments') || '[]');
  pendingShipments.push({
    id: shipmentId,
    date: new Date().toLocaleString(),
    shop: shop,
    rice: rice,
    wheat: wheat,
    sugar: sugar,
    oil: oil,
    dal: dal,
    salt: salt,
    soap: soap
  });
  localStorage.setItem('pendingShipments', JSON.stringify(pendingShipments));
  
  // 2. Log History
  let history = JSON.parse(localStorage.getItem('govSupplyHistory') || '[]');
  history.push({
    id: shipmentId,
    date: new Date().toLocaleString(),
    shop: shop,
    rice: rice,
    wheat: wheat,
    sugar: sugar,
    oil: oil,
    dal: dal,
    salt: salt,
    soap: soap,
    status: 'Processing'
  });
  localStorage.setItem('govSupplyHistory', JSON.stringify(history));
  
  alert(`Stock successfully dispatched to ${shop}! Waiting for Dealer to accept.`);
  
  // Reset Form
  document.querySelectorAll('.grid-form input[type="number"]').forEach(input => input.value = 0);
  
  // Re-render History
  renderSupplyHistory();
};

function renderSupplyHistory() {
  const tbody = document.getElementById('supply-history-body');
  if (!tbody) return;
  
  let history = JSON.parse(localStorage.getItem('govSupplyHistory') || '[]');
  
  // Sort descending by date
  history.sort((a, b) => b.id - a.id);
  
  if (history.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; color: #94a3b8; padding: 2rem;">No supply history available.</td></tr>';
    return;
  }
  
  tbody.innerHTML = history.map(h => {
    const status = h.status || 'Processing';
    let badgeClass = 'badge-warning';
    let displayStatus = status;

    if (status === 'Delivered' || status === 'Accepted') {
      badgeClass = 'badge-success';
      displayStatus = 'Delivered';
    } else if (status === 'Processing') {
      badgeClass = 'badge-warning';
      displayStatus = 'Processing';
    }
    
    return `
      <tr>
        <td style="font-size: 0.85rem; color: #475569; white-space: nowrap;">${h.date}</td>
        <td style="font-weight: 600; color: #1e293b;">${h.shop}</td>
        <td style="font-weight: 500;">${h.rice}</td>
        <td style="font-weight: 500;">${h.wheat}</td>
        <td style="font-weight: 500;">${h.sugar}</td>
        <td style="font-weight: 500;">${h.oil}</td>
        <td style="font-weight: 500;">${h.dal}</td>
        <td style="font-weight: 500;">${h.salt || 0}</td>
        <td style="font-weight: 500;">${h.soap || 0}</td>
        <td><span class="badge ${badgeClass}" style="padding: 4px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase;">${displayStatus}</span></td>
      </tr>
    `;
  }).join('');
}
