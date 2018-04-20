import moment = require('moment');

export const CONVERT_TO_SECONDS_FACTOR = {
    m: 60,
    h: 3600,
    d: 28800,
    w: 144000
};

/**
 * Turn a parsed duration into seconds
 * @param {number} value
 * @param {string} unit
 * @return {number}
 */
export function parsedDurationToSeconds(value: number, unit: string): number {
    return value * CONVERT_TO_SECONDS_FACTOR[unit];
}

/**
 * Parse a duration given in the format 1.5h to seconds
 * @param {string} duration
 * @return {number}
 */
export function parseDuration(duration: string): { value: number, unit: string } | null {
    const regex = /^(\d+(\.\d+)?)([hmdw])$/;
    const result = regex.exec(duration);
    if (result) {
        const unit = result[3];
        const value = parseFloat(result[1]);
        return {
            value,
            unit
        };
    } else {
        return null;
    }
}

export function parseTimeOfDay(time: string): Date | null {
    const hours24Regex = /^(([01]?[0-9]|2[0-3]):[0-5][0-9])$/;
    const result24 = hours24Regex.exec(time);
    if (result24) {
        return moment(time, 'H:mm').toDate();
    } else {
        const hours12Regex = /^((1[012]|[1-9]):[0-5][0-9](\s)?(am|pm))$/i;
        const result12 = hours12Regex.exec(time);
        if (result12) {
            return moment(time, 'h:mm A').toDate();
        } else {
            return null;
        }
    }

}