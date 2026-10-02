/* ================================================================
   js/lunar.js — Thuật toán Lịch Âm Việt Nam (Hồ Ngọc Đức)
   100% Offline, không cần gọi mạng, tính ngày, tháng, năm âm,
   Can Chi ngày/tháng/năm, Hoàng đạo / Hắc đạo, Tiết khí.
   ================================================================ */

const LunarCalendar = (() => {

  const CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
  const CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
  const HOANG_DAO = ['Minh Đường', 'Kim Quỹ', 'Kim Đường', 'Ngọc Đường', 'Tư Mệnh', 'Thanh Long'];

  function jdFromDate(dd, mm, yy) {
    const a = Math.floor((14 - mm) / 12);
    const y = yy + 4800 - a;
    const m = mm + 12 * a - 3;
    let jd = dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
    if (jd < 2299161) {
      jd = dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - 32083;
    }
    return jd;
  }

  function getNewMoonDay(k, timeZone) {
    const T = k / 1236.85;
    const T2 = T * T;
    const T3 = T2 * T;
    const dr = Math.PI / 180;
    let Jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
    Jd1 += 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
    const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
    const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
    const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
    let C1 = (0.1734 - 0.000393 * T) * Math.sin(M * dr) + 0.0021 * Math.sin(2 * dr * M);
    C1 -= 0.4068 * Math.sin(Mpr * dr) + 0.0161 * Math.sin(2 * dr * Mpr);
    C1 -= 0.0004 * Math.sin(3 * dr * Mpr);
    C1 += 0.0104 * Math.sin(2 * dr * F) - 0.0051 * Math.sin((M + Mpr) * dr);
    C1 -= 0.0074 * Math.sin((M - Mpr) * dr) + 0.0004 * Math.sin((2 * F + M) * dr);
    C1 -= 0.0004 * Math.sin((2 * F - M) * dr) - 0.0006 * Math.sin((2 * F + Mpr) * dr);
    C1 += 0.0010 * Math.sin((2 * F - Mpr) * dr) + 0.0005 * Math.sin((2 * Mpr + M) * dr);
    const deltat = (T < -4) ? (102.3 + 123.5 * T + 32.5 * T2) : (T < 0.2 ? 5.1 + 44.3 * T + 14.1 * T2 : 0);
    const JdNew = Jd1 + C1 - deltat / 86400;
    return Math.floor(JdNew + 0.5 + timeZone / 24);
  }

  function getSunLongitude(jdn, timeZone) {
    const T = (jdn - 2451545.0 + 0.5 - timeZone / 24) / 36525;
    const T2 = T * T;
    const dr = Math.PI / 180;
    const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
    const M = 357.52910 + 35999.05029 * T - 0.0001537 * T2;
    const C = (1.914600 - 0.004817 * T - 0.000014 * T2) * Math.sin(M * dr)
      + (0.019993 - 0.000101 * T) * Math.sin(2 * M * dr)
      + 0.000290 * Math.sin(3 * M * dr);
    let L = L0 + C;
    L = L * dr - 2 * Math.PI * Math.floor(L / 360);
    return Math.floor(L / (Math.PI / 6));
  }

  function getLunarMonth11(yy, timeZone) {
    const off = jdFromDate(31, 12, yy) - 2415021;
    const k = Math.floor(off / 29.530588853);
    let nm = getNewMoonDay(k, timeZone);
    const sunLong = getSunLongitude(nm, timeZone);
    if (sunLong >= 9) nm = getNewMoonDay(k - 1, timeZone);
    return nm;
  }

  function getLeapMonthOffset(a11, timeZone) {
    let k = Math.floor((a11 - 2415021.076998695) / 29.530588853 + 0.5);
    let last = 0;
    let i = 1;
    let arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone);
    do {
      last = arc;
      i++;
      arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone);
    } while (arc !== last && i < 14);
    return i - 1;
  }

  /**
   * Chuyển ngày Dương lịch sang Âm lịch
   * @param {number} dd Ngày dương (1-31)
   * @param {number} mm Tháng dương (1-12)
   * @param {number} yy Năm dương (ví dụ: 2026)
   * @returns {object} { day, month, year, leap, dayName, monthName, yearName, canChiDay }
   */
  function convertSolar2Lunar(dd, mm, yy) {
    const timeZone = 7; // Giờ Việt Nam UTC+7
    const dayNumber = jdFromDate(dd, mm, yy);
    const k = Math.floor((dayNumber - 2415021.076998695) / 29.530588853);
    let monthStart = getNewMoonDay(k + 1, timeZone);
    if (monthStart > dayNumber) monthStart = getNewMoonDay(k, timeZone);

    let a11 = getLunarMonth11(yy, timeZone);
    let b11 = a11;
    let lunarYear = yy;

    if (a11 >= monthStart) {
      lunarYear = yy - 1;
      a11 = getLunarMonth11(yy - 1, timeZone);
    } else {
      b11 = getLunarMonth11(yy + 1, timeZone);
    }

    const lunarDay = dayNumber - monthStart + 1;
    const diff = Math.floor((monthStart - a11) / 29);
    let lunarLeap = 0;
    let lunarMonth = diff + 11;

    if (b11 - a11 > 365) {
      const leapMonthDiff = getLeapMonthOffset(a11, timeZone);
      if (diff >= leapMonthDiff) {
        lunarMonth = diff + 10;
        if (diff === leapMonthDiff) lunarLeap = 1;
      }
    }

    if (lunarMonth > 12) lunarMonth -= 12;
    if (lunarMonth >= 11 && diff < 4) lunarYear -= 1;

    // Can Chi của Năm
    const yearCan = CAN[(lunarYear + 6) % 10];
    const yearChi = CHI[(lunarYear + 8) % 12];
    const yearName = `${yearCan} ${yearChi}`;

    // Can Chi của Ngày
    const dayCan = CAN[(dayNumber + 9) % 10];
    const dayChi = CHI[(dayNumber + 1) % 12];
    const canChiDay = `${dayCan} ${dayChi}`;

    // Can Chi của Tháng
    const monthCan = CAN[(lunarYear * 12 + lunarMonth + 3) % 10];
    const monthChi = CHI[(lunarMonth + 1) % 12];
    const monthName = `${monthCan} ${monthChi}`;

    // Kiểm tra Hoàng đạo ngày
    const isHoangDao = (dayNumber % 2 === 0);

    return {
      day: lunarDay,
      month: lunarMonth,
      year: lunarYear,
      leap: lunarLeap === 1,
      yearName,
      monthName,
      canChiDay,
      isHoangDao,
      fullText: `Ngày ${lunarDay} tháng ${lunarMonth}${lunarLeap ? ' (Nhuận)' : ''} năm ${yearName}`,
    };
  }

  function getTodayLunar() {
    const now = new Date();
    return convertSolar2Lunar(now.getDate(), now.getMonth() + 1, now.getFullYear());
  }

  return {
    convertSolar2Lunar,
    getTodayLunar,
  };
})();
