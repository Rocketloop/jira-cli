import wrap = require('word-wrap');

/**
 * Turn a number to a displayable fixed decimal number, if needed
 * @param {number} number
 * @param {number} decimals
 * @return {string}
 */
export function displayNumber(number: number, decimals = 2) {
    const factor = Math.pow(10, decimals);
    const roundedNumber = Math.round(number * factor) / factor;
    return `${roundedNumber}`;
}

export function displayText(text: string, width: number) {
    return text.split('\n').map(line => wrap(line.trim(), {width, indent: '', trim: true})).join('\n');
}