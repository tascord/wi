import { writeFileSync } from "fs";
import { join } from "path";
import Chalk from "chalk";
import { Variables, WiVariableType } from "./parser";

const filename = 'example.wi';

// Literals
export type TokenOpenParen = { type: 'TokenOpenParen', position: number }
export type TokenCloseParen = { type: 'TokenCloseParen', position: number }
export type TokenOpenBrace = { type: 'TokenOpenBrace', position: number }
export type TokenCloseBrace = { type: 'TokenCloseBrace', position: number }
export type TokenAssigner = { type: 'TokenAssigner', position: number }
export type TokenEnd = { type: 'TokenEnd', position: number }
export type TokenDeclaration = { type: 'TokenDeclaration', position: number }
export type TokenTypeDescriptor = { type: 'TokenTypeDescriptor', position: number }
export type TokenSeparator = { type: 'TokenSeparator', position: number }

// Valued tokens
export type TokenIdentifier = { type: 'TokenIdentifier', value: string, position: number }
export type TokenNumeric = { type: 'TokenNumeric', value: string, position: number }
export type TokenString = { type: 'TokenString', value: string, position: number }

export type Token =
    TokenOpenParen |
    TokenCloseParen |
    TokenOpenBrace |
    TokenCloseBrace |
    TokenAssigner |
    TokenEnd |
    TokenDeclaration |
    TokenTypeDescriptor |
    TokenSeparator |

    TokenIdentifier |
    TokenNumeric |
    TokenString


/** ------------------------------- **/

const ExtendedLiterals = Object.entries(Variables)
    .map(([n, c]) => Object.values(new c(n as WiVariableType).actions)
        .map(a => a.literal_syntax))
    .flat()
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i) as string[];

/** ------------------------------- **/

// Let's do this!
export default function Tokenize(file: string) {

    let Tokens: Token[] = [];

    const Meta = {
        index: 0,
        buffer: '',
        file_length: file.length
    }

    /** ------------------------------- **/

    function Log(reason: string, type: 'error' | 'warning' | 'info') {
        const symbol =
            type === 'error' ? '✖' :
                type === 'warning' ? '⚠' :
                    type === 'info' ? 'ℹ' : '?';

        const colour =
            type === 'error' ? Chalk.redBright :
                type === 'warning' ? Chalk.yellowBright :
                    type === 'info' ? Chalk.blueBright : Chalk.whiteBright;

        // Get line that caused the error
        let [line_index, line, buffer, line_no, finish_at_line] = [0, '', '', 0, false];
        for (let i = 0; true; i++) {

            if (i == Meta.index) finish_at_line = true;
            if (!finish_at_line) line_index++;

            if (file[i] === '\n' || i >= file.length) {

                line = buffer;
                buffer = '';

                if (finish_at_line) break

                line_index = 0;
                line_no++;
            }

            else {
                buffer += file[i];
            }
        }

        if (type === 'info') return console.log(colour(`[${symbol}] ${reason}}`));

        // Print line with error
        console.log(colour(`${Chalk.whiteBright('[') + colour(symbol) + Chalk.whiteBright(']')} ${filename}:${line_no + 1}:${Meta.index}`));
        console.log('\t' + line)
        console.log('\t' + ' '.repeat(line_index) + colour('^'));
        console.log('\n' + colour(reason));
        if (type === 'warning') return;

        console.log(`at ${'global'}\n`); // ToDo: Stack trace
        if (process.argv.includes('-vv')) console.trace('Compiler trace');

        if (type === "error") process.exit(1);

    }

    /** ------------------------------- **/

    function End() {
        if(process.argv.includes('-d')) writeFileSync(join(__dirname, './.tokens.json'), JSON.stringify(Tokens, null, 2));
    }

    /** ------------------------------- **/

    function LookForward(boundary: string): boolean {
        let buffer = '';
        for (let i = Meta.index; i < Meta.file_length; i++) {
            if (buffer === boundary) {
                Meta.index = i;
                return true;
            }
            buffer += file[i];
        }

        return false;
    }

    for (let char = file[0]; Meta.index < Meta.file_length; char = file[++Meta.index]) {

        // ignore single line comments
        if (char === '/' && file[Meta.index + 1] === '/') {
            Meta.buffer = Meta.buffer.slice(0, -1);
            while (char !== '\n') {
                Meta.index++;
                char = file[Meta.index];
            }
            continue;
        }

        // ignore multi line comments
        if (char === '/' && file[Meta.index + 1] === '*') {
            Meta.buffer = Meta.buffer.slice(0, -1);
            while (char !== '*' || file[Meta.index + 1] !== '/') {
                Meta.index++;
                char = file[Meta.index];
            }
            Meta.index++;
            char = file[Meta.index];
            continue;
        }

        // ignore whitespace
        if (char === ' ' || char === '\t' || char === '\n') {
            Meta.buffer = Meta.buffer.slice(0, -1);
            continue;
        }

        // literals
        if (char === '(') { Tokens.push({ type: 'TokenOpenParen', position: Meta.index }); continue; }
        if (char === ')') { Tokens.push({ type: 'TokenCloseParen', position: Meta.index }); continue; }
        if (char === '{') { Tokens.push({ type: 'TokenOpenBrace', position: Meta.index }); continue; }
        if (char === '}') { Tokens.push({ type: 'TokenCloseBrace', position: Meta.index }); continue; }
        if (char === '=') { Tokens.push({ type: 'TokenAssigner', position: Meta.index }); continue; }
        if (char === ';') { Tokens.push({ type: 'TokenEnd', position: Meta.index }); continue; }
        if (char === ',') { Tokens.push({ type: 'TokenSeparator', position: Meta.index }); continue; }

        // look-ahead-s
        if (LookForward('let')) { Tokens.push({ type: 'TokenDeclaration', position: Meta.index }); continue; }
        if (LookForward('as')) { Tokens.push({ type: 'TokenTypeDescriptor', position: Meta.index }); continue; }

        // numerical identifier
        if (/[0-9]/.test(char)) {
            let value = '';

            char = file[Meta.index]
            while (/[0-9]/.test(char)) {
                value += char;
                char = file[++Meta.index];
                if (Meta.index >= Meta.file_length) Log('Unexpected end of file while looking for number.', 'error');
            }

            Tokens.push({ type: 'TokenNumeric', value, position: Meta.index-- });
            continue;
        }

        // string identifier
        if (char === '"') {
            let value = '';
            char = file[++Meta.index];
            while (char !== '"') {
                value += char;
                char = file[++Meta.index];
                if (Meta.index > Meta.file_length) Log(`Unexpected end of file while looking for String.`, 'error');
            }
            Tokens.push({ type: 'TokenString', value, position: Meta.index });
            continue;
        }

        // identifier literal
        if (/[a-zA-z_0-9]/.test(char)) {
            let value = '';

            char = file[Meta.index]
            while (/[a-zA-z_0-9]/.test(char)) {
                value += char;
                char = file[++Meta.index];
                if (Meta.index >= Meta.file_length) Log('Unexpected end of file while looking for number.', 'error');
            }

            Tokens.push({ type: 'TokenIdentifier', value, position: Meta.index-- });
            continue;
        }

        // cool identifier literals
        if (ExtendedLiterals.includes(char)) {
            Tokens.push({ type: 'TokenIdentifier', value: char, position: Meta.index });
            continue;
        }

        // unknown token
        Log(`Unexpected token '${char}'.`, 'error');

    }

    End();
    return Tokens;

}