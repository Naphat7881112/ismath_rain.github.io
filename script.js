document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("input-form").addEventListener("submit", function (event) {
        event.preventDefault(); // ป้องกันการโหลดหน้าใหม่

        const distance = parseFloat(document.getElementById("distance").value);
        const privateVehicle = parseInt(document.getElementById("private_vehicle").value);
        const rmse = 10.19;

        if (isNaN(distance)) {
            alert("กรุณากรอกระยะทางให้ถูกต้อง");
            return;
        }

        // ค่าคงที่ของสมการ
        const a = 16.130;
        const b1 = 0.222; // ค่าสัมประสิทธิ์ปริมาณน้ำฝน
        const b2 = 0.695; // ค่าสัมประสิทธิ์ระยะทาง
        const b3 = -7.005; // ค่าสัมประสิทธิ์พาหนะส่วนตัว

        // ฟังก์ชันคำนวณระยะเวลาเดินทาง
        function calculateTime(r) {
            return a + b1 * r + b2 * distance + b3 * privateVehicle;
        }

        // ข้อมูลเกณฑ์ปริมาณน้ำฝน
        const intervals = [
            { range: "ไม่มีฝนตก (0 mm)", r1: 0, adjust: "upper" },
            { range: "ฝนตกเล็กน้อย (0.1 - 10 mm)", r1: 0.1, r2: 10 },
            { range: "ฝนตกปานกลาง (10.1 - 35 mm)", r1: 10.1, r2: 35 },
            { range: "ฝนตกหนัก (35.1 - 90 mm)", r1: 35.1, r2: 90 },
            { range: "ฝนตกหนักมาก (>90 mm)", r1: 90.1, adjust: "lower" }
        ];

        // อัปเดตตาราง
        const tableBody = document.getElementById("rainfall-table");
        tableBody.innerHTML = "";

        intervals.forEach(interval => {
            let minTime = calculateTime(interval.r1);
            let maxTime = interval.r2 !== undefined ? calculateTime(interval.r2) : null;

            if (interval.adjust === "upper") {
                minTime += rmse; // บวก RMSE สำหรับ "ไม่เกิน"
            } else if (interval.adjust === "lower") {
                minTime -= rmse; // ลบ RMSE สำหรับ "อย่างน้อย"
            } else {
                minTime -= rmse; // ลบ RMSE สำหรับขอบล่าง
                maxTime += rmse; // บวก RMSE สำหรับขอบบน
            }

            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${interval.range}</td>
                <td>
                    ${
                        interval.adjust === "upper"
                            ? `ไม่เกิน ${minTime.toFixed(2)} นาที`
                            : interval.adjust === "lower"
                            ? `อย่างน้อย ${minTime.toFixed(2)} นาที`
                            : `${minTime.toFixed(2)} - ${maxTime.toFixed(2)} นาที`
                    }
                </td>
            `;
            tableBody.appendChild(row);
        });

        // ข้อมูลกราฟ
        const rainfall = Array.from({ length: 100 }, (_, i) => i * 1);
        const travelTimes = rainfall.map(r => calculateTime(r));
        const lowerBound = travelTimes.map(y => y - rmse);
        const upperBound = travelTimes.map(y => y + rmse);

        const trace1 = {
            x: rainfall,
            y: travelTimes,
            mode: "lines",
            name: "เวลาการเดินทาง",
            line: { color: "blue" },
        };
        const trace2 = {
            x: rainfall.concat(rainfall.slice().reverse()), // รวมข้อมูลสองฝั่ง
            y: upperBound.concat(lowerBound.slice().reverse()), // รวมข้อมูลค่าบนและค่าล่าง
            fill: "toself",
            fillcolor: "rgba(0,100,255,0.2)",
            line: { color: "transparent" },
            name: "ค่าคลาดเคลื่อน",
        };

        const layout = {
            title: "เวลาการเดินทางตามปริมาณน้ำฝน",
            xaxis: { title: "ปริมาณน้ำฝน (มม.)" },
            yaxis: { title: "ระยะเวลาเดินทาง (นาที)" },
            margin: { t: 40, l: 50, r: 30, b: 50 },
        };

        Plotly.newPlot("graph-container", [trace1, trace2], layout);
    });
});
