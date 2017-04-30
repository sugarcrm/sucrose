
d = new Date(0);
console.log(d, d.valueOf(), d.toISOString());
console.log(d3.timeMonth(d) < d);
d = new Date('1980');
console.log(d, d.valueOf(), d.toISOString());
console.log(d3.timeMonth(d) < d);
d = new Date('1980-01-01');
console.log(d, d.valueOf(), d.toISOString());
console.log(d3.timeMonth(d) < d);
d = new Date('1/1/1980');
console.log(d, d.valueOf(), d.toISOString());
console.log(d3.timeMonth(d) < d);

Chrome

Wed Dec 31 1969 19:00:00 GMT-0500 (EST)
Mon Dec 31 1979 19:00:00 GMT-0500 (EST)
Mon Dec 31 1979 19:00:00 GMT-0500 (EST)
Tue Jan 01 1980 00:00:00 GMT-0500 (EST)

Firefox
Date 1970-01-01T00:00:00.000Z
Date 1980-01-01T00:00:00.000Z
Date 1980-01-01T00:00:00.000Z
Date 1980-01-01T05:00:00.000Z

var date = new Date(0);
var formatMillisecond = ".%L",
    formatSecond = ":%S",
    formatMinute = "%I:%M",
    formatHour = "%I %p",
    formatDay = "%a %d",
    formatWeek = "%b %d",
    formatMonth = "%B",
    formatYear = "%Y";

//formatMillisecond
console.log('utcSecond', d3.utcSecond(date))
console.log(d3.utcSecond(date) < date)
console.log('formatMillisecond', formatMillisecond)
console.log('  ')
// formatSecond
console.log('utcMinute', d3.utcMinute(date))
console.log(d3.utcMinute(date) < date)
console.log('formatSecond', formatSecond)
console.log('  ')
// formatMinute
console.log('utcHour', d3.utcHour(date))
console.log(d3.utcHour(date) < date)
console.log('formatMinute', formatMinute)
console.log('  ')
// formatHour
console.log('utcDay', d3.utcDay(date))
console.log(d3.utcDay(date) < date)
console.log('formatHour', formatHour)
console.log('  ')
// (d3.utcWeek(date) < date ? formatDay : formatWeek)
console.log(d3.utcMonth(date))
console.log(d3.utcMonth(date) < date)
console.log('  ')
// formatMonth
console.log('utcYear', d3.utcYear(date))
console.log(d3.utcYear(date) < date)
console.log('formatMonth', formatMonth)
console.log('  ')
// formatYear;
console.log('formatYear', formatYear)
