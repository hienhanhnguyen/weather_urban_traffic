const PART_OPTIONS = {
	year: 'numeric',
	month: '2-digit',
	day: '2-digit',
	hour: '2-digit',
	minute: '2-digit',
	second: '2-digit',
	hourCycle: 'h23',
};

function safeZone(timeZone) {
	try {
		new Intl.DateTimeFormat('en-US', { timeZone });
		return timeZone;
	} catch {
		return 'UTC';
	}
}

function partsInZone(instant, timeZone) {
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone,
		...PART_OPTIONS,
	}).formatToParts(instant);

	const value = (type) =>
		Number(parts.find((part) => part.type === type)?.value);

	return {
		year: value('year'),
		month: value('month'),
		day: value('day'),
		hour: value('hour'),
		minute: value('minute'),
		second: value('second'),
	};
}

function offsetMs(instant, timeZone) {
	const parts = partsInZone(instant, timeZone);
	const asIfUtc = Date.UTC(
		parts.year,
		parts.month - 1,
		parts.day,
		parts.hour,
		parts.minute,
		parts.second
	);
	return asIfUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

function fromZoned({ year, month, day, hour }, timeZone) {
	const guess = Date.UTC(year, month - 1, day, hour);

	const first = offsetMs(new Date(guess), timeZone);
	const corrected = new Date(guess - first);

	const second = offsetMs(corrected, timeZone);
	return second === first ? corrected : new Date(guess - second);
}

const addDays = ({ year, month, day }, days) => {
	const shifted = new Date(Date.UTC(year, month - 1, day + days));
	return {
		year: shifted.getUTCFullYear(),
		month: shifted.getUTCMonth() + 1,
		day: shifted.getUTCDate(),
		weekday: shifted.getUTCDay(),
	};
};

function computeNextRun(schedule, timeZone, from = new Date()) {
	const zone = safeZone(timeZone);
	const today = partsInZone(from, zone);

	for (let offset = 0; offset <= 62; offset += 1) {
		const date = addDays(today, offset);

		if (schedule.frequency === 'weekly' && date.weekday !== schedule.weekday) {
			continue;
		}
		if (
			schedule.frequency === 'monthly' &&
			date.day !== schedule.day_of_month
		) {
			continue;
		}

		const at = fromZoned({ ...date, hour: schedule.hour }, zone);
		if (at.getTime() > from.getTime()) return at;
	}

	throw new Error(`Cannot schedule frequency "${schedule.frequency}"`);
}

module.exports = { computeNextRun, partsInZone, fromZoned, safeZone };
