// ตั้งค่าค่าคงที่สำหรับการคำนวณ
const CONSTANTS = {
    baseTime: 16.130,      // ค่าคงที่พื้นฐานของเวลา
    rainCoef: 0.222,       // ค่าสัมประสิทธิ์ของปริมาณน้ำฝน
    distanceCoef: 0.695,   // ค่าสัมประสิทธิ์ของระยะทาง
    vehicleCoef: -7.005,   // ค่าสัมประสิทธิ์ของการใช้พาหนะส่วนตัว
    rmse: 10.19           // ค่าความคลาดเคลื่อนของแบบจำลอง
};

// เกณฑ์ปริมาณน้ำฝนและช่วงของแต่ละระดับ
const RAIN_INTERVALS = [
    { range: "ไม่มีฝนตก (0 mm)", r1: 0, adjust: "upper" },
    { range: "ฝนตกเล็กน้อย (0.1 - 10 mm)", r1: 0.1, r2: 10 },
    { range: "ฝนตกปานกลาง (10.1 - 35 mm)", r1: 10.1, r2: 35 },
    { range: "ฝนตกหนัก (35.1 - 90 mm)", r1: 35.1, r2: 90 },
    { range: "ฝนตกหนักมาก (>90 mm)", r1: 90.1, adjust: "lower" }
];

// ชื่อเดือนภาษาไทย
const THAI_MONTHS = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
];

// ฟังก์ชันคำนวณเวลาเดินทาง
function calculateTravelTime(rainfall, distance, usePrivateVehicle) {
    return CONSTANTS.baseTime + 
           CONSTANTS.rainCoef * rainfall + 
           CONSTANTS.distanceCoef * distance + 
           CONSTANTS.vehicleCoef * usePrivateVehicle;
}

// ฟังก์ชันอัพเดตตารางเกณฑ์ปริมาณน้ำฝน
function updateRainfallTable(distance, usePrivateVehicle) {
    const tableBody = document.getElementById("rainfall-table");
    tableBody.innerHTML = "";

    RAIN_INTERVALS.forEach(interval => {
        let minTime = calculateTravelTime(interval.r1, distance, usePrivateVehicle);
        let maxTime = interval.r2 !== undefined ? 
            calculateTravelTime(interval.r2, distance, usePrivateVehicle) : null;

        // ปรับค่าตามช่วงความคลาดเคลื่อน
        if (interval.adjust === "upper") {
            minTime += CONSTANTS.rmse;
        } else if (interval.adjust === "lower") {
            minTime -= CONSTANTS.rmse;
        } else {
            minTime -= CONSTANTS.rmse;
            maxTime += CONSTANTS.rmse;
        }

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${interval.range}</td>
            <td>${formatTimeRange(minTime, maxTime, interval.adjust)}</td>
        `;
        tableBody.appendChild(row);
    });
}

// ฟังก์ชันจัดรูปแบบการแสดงผลช่วงเวลา
function formatTimeRange(minTime, maxTime, adjustType) {
    if (adjustType === "upper") {
        return `ไม่เกิน ${Math.round(minTime)} นาที`;
    } else if (adjustType === "lower") {
        return `อย่างน้อย ${Math.round(minTime)} นาที`;
    }
    return `${Math.round(minTime)} - ${Math.round(maxTime)} นาที`;
}

// ฟังก์ชันสร้างกราฟ
function createGraph(distance, usePrivateVehicle) {
    const rainfall = Array.from({ length: 100 }, (_, i) => i);
    const travelTimes = rainfall.map(r => 
        calculateTravelTime(r, distance, usePrivateVehicle));
    
    const lowerBound = travelTimes.map(y => y - CONSTANTS.rmse);
    const upperBound = travelTimes.map(y => y + CONSTANTS.rmse);

    const data = [
        {
            x: rainfall,
            y: travelTimes,
            mode: "lines",
            name: "เวลาการเดินทาง",
            line: { color: "blue" }
        },
        {
            x: rainfall.concat(rainfall.slice().reverse()),
            y: upperBound.concat(lowerBound.slice().reverse()),
            fill: "toself",
            fillcolor: "rgba(0,100,255,0.2)",
            line: { color: "transparent" },
            name: "ช่วงความคลาดเคลื่อน"
        }
    ];

    const layout = {
        title: "เวลาการเดินทางตามปริมาณน้ำฝน",
        xaxis: { title: "ปริมาณน้ำฝน (มม.)", range: [0, Math.max(...rainfall)] },
        yaxis: { title: "ระยะเวลาเดินทาง (นาที)", range: [0, Math.max(...upperBound)] },
        margin: { t: 40, l: 50, r: 30, b: 50 },
        font: { family: "Anuphan, serif" } // เพิ่มฟอนต์ที่นี่
    };

    Plotly.newPlot("graph-container", data, layout);

    // เพิ่ม animation
    Plotly.animate('graph-container', {
        data: data,
        layout: layout
    }, {
        transition: {
            duration: 500,
            easing: 'cubic-in-out'
        },
        frame: {
            duration: 500,
            redraw: false
        }
    });
}

// ฟังก์ชันแสดงข้อมูลฝนรายวัน
function showRainData() {
    const currentDate = new Date();
    const thaiYear = currentDate.getFullYear() + 543;
    const month = currentDate.getMonth();
    const date = currentDate.getDate();
    const hour = currentDate.getHours();
    const minute = currentDate.getMinutes();

    $.ajax({
        url: "rain_data.csv",
        dataType: "text",
        success: function(data) {
            const rows = data.split(/\r?\n|\r/);
            let tableHTML = `
                <h4 class="subtitle">วันที่ ${date} ${THAI_MONTHS[month]} ${thaiYear} 
                เวลา ${hour}:${minute.toString().padStart(2, '0')}</h4>
                <table class="table is-bordered is-striped is-fullwidth anuphan-table">
                    <thead>
                        <tr>
                            <th>ปี</th>
                            <th>ปริมาณฝน</th>
                            <th>เวลาเดินทาง</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            // กรองข้อมูลเฉพาะวันที่ปัจจุบัน
            rows.forEach(row => {
                const cells = row.split(",");
                if (cells[2] == date && cells[3] == month + 1) {
                    const rainVolume = getRainVolumeForHour(cells, hour);
                    const travelTimeRange = getTravelTimeRangeForRain(rainVolume);
                    
                    tableHTML += `
                        <tr>
                            <td>${cells[4]}</td>
                            <td>${rainVolume}</td>
                            <td>${travelTimeRange}</td>
                        </tr>
                    `;
                }
            });

            tableHTML += '</tbody></table>';
            document.getElementById('rain_table').innerHTML = tableHTML;
        },
        error: function(xhr, status, error) {
            console.error("ไม่สามารถโหลดข้อมูลฝนได้:", error);
            document.getElementById('rain_table').innerHTML = 
                '<div class="notification is-danger">ไม่สามารถโหลดข้อมูลฝนได้</div>';
        }
    });
}

// ฟังก์ชันดึงปริมาณฝนตามช่วงเวลา
function getRainVolumeForHour(cells, hour) {
    const hourRanges = [
        { start: 0, end: 1, index: 5 },
        { start: 1, end: 4, index: 6 },
        { start: 4, end: 7, index: 7 },
        { start: 7, end: 10, index: 8 },
        { start: 10, end: 13, index: 9 },
        { start: 13, end: 16, index: 10 },
        { start: 16, end: 19, index: 11 },
        { start: 19, end: 22, index: 12 },
        { start: 22, end: 24, index: 5 }
    ];

    const range = hourRanges.find(r => hour >= r.start && hour < r.end);
    return range ? cells[range.index] : "0.0";
}

// ฟังก์ชันดึงช่วงเวลาเดินทางตามปริมาณฝน
function getTravelTimeRangeForRain(rainVolume) {
    const distance = parseFloat(document.getElementById("distance").value);
    const usePrivateVehicle = parseInt(document.getElementById("private_vehicle").value);
    const minTime = calculateTravelTime(parseFloat(rainVolume), distance, usePrivateVehicle) - CONSTANTS.rmse;
    const maxTime = calculateTravelTime(parseFloat(rainVolume), distance, usePrivateVehicle) + CONSTANTS.rmse;
    return `${Math.round(minTime)} - ${Math.round(maxTime)} นาที`;
}

// เมื่อโหลดหน้าเว็บเสร็จ
document.addEventListener("DOMContentLoaded", function() {
    // จัดการการส่งฟอร์ม
    document.getElementById("input-form").addEventListener("submit", function(event) {
        event.preventDefault();
        
        const distance = parseFloat(document.getElementById("distance").value);
        const usePrivateVehicle = parseInt(document.getElementById("private_vehicle").value);

        if (isNaN(distance)) {
            alert("กรุณากรอกระยะทางให้ถูกต้อง");
            return;
        }

        // อัพเดตการแสดงผลทั้งหมด
        updateRainfallTable(distance, usePrivateVehicle);
        createGraph(distance, usePrivateVehicle);
        showRainData();
    });
});
