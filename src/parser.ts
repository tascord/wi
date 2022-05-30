import { writeFileSync } from "fs";
import { Token, TokenAssigner, TokenIdentifier, TokenNumeric, TokenString, TokenTypeDescriptor } from "./tokenizer";
import Chalk from 'chalk';

const filename = 'example.wi';

const VariableTypes = ['string', 'i8', 'i16', 'i32', 'i64', 'u8', 'u16', 'u32', 'u64', 'f32', 'f64', 'bool', 'char', 'object'] as const;
const ReturnTypes = ['void', ...VariableTypes] as const;

export type WiVariableType = typeof VariableTypes[number];
type WiFunctionReturnType = typeof ReturnTypes[number];

type WiNode = WiVariable | WiFunction | WiCall;

/** ------------------------------- **/

type WiVariableAction = {
    literal_syntax?: string,
    spread_arguments?: boolean,
    arguments: WiVariableType[][],
}

class WiVariable {
    private _name: string = '';
    private _type: WiVariableType;
    private _value: any;
    protected _actions: { [key: string]: WiVariableAction } = {};

    get name() { return this._name; }
    get type() { return this._type; }
    get value() { return this._value; }
    get actions() { return this._actions; }

    constructor(type: WiVariableType) { this._type = type; }

    type_check(value: any) { return false; }

    set_name(name: string) {
        if (this._name) Error('Cannot redefine variable name');
        this._name = name;
        return this;
    }

    set_value(value: any) {
        if (!this.type_check(value)) Error(`Value ${value} is not of type ${this._type}.`);
        this._value = value;
        return this;
    }

}

const NumberActionData: Omit<WiVariableAction, 'literal_syntax'> = {
    spread_arguments: true,
    arguments: [['i8', 'i16', 'i32', 'i64', 'u8', 'u16', 'u32', 'u64', 'f32', 'f64']]
}

class WiNumber extends WiVariable {

    constructor(type: WiVariableType) {
        super(type);
        this._actions = {
            add: { literal_syntax: '+', ...NumberActionData },
            subtract: { literal_syntax: '-', ...NumberActionData },
            multiply: { literal_syntax: '*', ...NumberActionData },
            divide: { literal_syntax: '/', ...NumberActionData },
        }
    }

    set_value(value: any): this {
        super.set_value(Number(value));
        return this;
    }

    public add(...n: number[]) {
        let sum = this.value;
        for (let i = 0; i < n.length; i++) {
            sum += n[i];
        }

        return sum;
    }

    sub(...n: number[]) {
        let sum = this.value;
        for (let i = 0; i < n.length; i++) {
            sum -= n[i];
        }

        return sum;
    }

    mul(...n: number[]) {
        let sum = this.value;
        for (let i = 0; i < n.length; i++) {
            sum *= n[i];
        }

        return sum;
    }

    div(...n: number[]) {
        let sum = this.value;
        for (let i = 0; i < n.length; i++) {
            sum /= n[i];
        }

        return sum;
    }

}

class WiInteger extends WiNumber {
    type_check(value: any): boolean {
        return Math.round(value as number) == value;
    }
}

class WiFloat extends WiNumber { /* .. */ }

export const Variables: { [Type in WiVariableType]: typeof WiVariable } = {
    i8: class WiI8 extends WiInteger {
        constructor() { super('i8'); }
        type_check(value: any) {
            return typeof value === 'number' && value >= -128 && value <= 127 && super.type_check(value);
        }
    },

    i16: class WiI16 extends WiInteger {
        constructor() { super('i16'); }
        type_check(value: any) {
            return typeof value === 'number' && value >= -32768 && value <= 32767 && super.type_check(value);
        }
    },

    i32: class WiI32 extends WiInteger {
        constructor() { super('i32'); }
        type_check(value: any) {
            return typeof value === 'number' && value >= -2147483648 && value <= 2147483647 && super.type_check(value);
        }
    },

    i64: class WiI64 extends WiInteger {
        constructor() { super('i64'); }
        type_check(value: any) {
            return typeof value === 'number' && value >= -9223372036854775808 && value <= 9223372036854775807 && super.type_check(value);
        }
    },

    u8: class WiU8 extends WiInteger {
        constructor() { super('u8'); }
        type_check(value: any) {
            return typeof value === 'number' && value >= 0 && value <= 255 && super.type_check(value);
        }
    },

    u16: class WiU16 extends WiInteger {
        constructor() { super('u16'); }
        type_check(value: any) {
            return typeof value === 'number' && value >= 0 && value <= 65535 && super.type_check(value);
        }
    },

    u32: class WiU32 extends WiInteger {
        constructor() { super('u32'); }
        type_check(value: any) {
            return typeof value === 'number' && value >= 0 && value <= 4294967295 && super.type_check(value);
        }
    },

    u64: class WiU64 extends WiInteger {
        constructor() { super('u64'); }
        type_check(value: any) {
            return typeof value === 'number' && value >= 0 && value <= 18446744073709551615 && super.type_check(value);
        }
    },

    f32: class WiF32 extends WiFloat {
        constructor() { super('f32'); }
        type_check(value: any) {
            return typeof value === 'number' && value >= -3.4028234663852886e+38 && value <= 3.4028234663852886e+38;
        }
    },

    f64: class WiF64 extends WiFloat {
        constructor() { super('f64'); }
        type_check(value: any) {
            return typeof value === 'number' && value >= -1.7976931348623157e+308 && value <= 1.7976931348623157e+308;
        }
    },

    bool: class WiBool extends WiVariable {
        constructor() { super('bool'); }
        type_check(value: any) {
            return typeof value === 'boolean';
        }
    },

    char: class WiChar extends WiVariable {
        constructor() { super('char'); }
        type_check(value: any) {
            return typeof value === 'string' && value.length === 1;
        }
    },

    string: class WiString extends WiVariable {
        constructor() { super('string'); }
        type_check(value: any) {
            return typeof value === 'string';
        }
    },

    object: class WiObject extends WiVariable {

        entries: WiVariable[] = [];

        constructor() {
            super('object');
            this._actions = {
                get: {
                    literal_syntax: '.',
                    arguments: [['string']]
                }
            }
        }

        get(name: string): WiVariable | null {
            if (!this.entries.find(e => e.name === name)) return null;
            return this.entries.find(e => e.name === name) ?? null;
        }

        type_check(value: any) {
            return typeof value === 'object';
        }
    }
}

/** ------------------------------- **/

class WiFunction {
    private _name: string = '';
    private _body: WiNode[] = [];
    readonly arguments: {
        name?: string,
        positional?: boolean,
        type: WiVariableType
    }[] = [];

    get name() { return this._name; }
    get body() { return this._body; }

    set_name(name: string) {
        if (this._name) Error('Cannot redefine function name');
        this._name = name;
        return this;
    }

    add_to_body(value: WiNode) {
        this._body.push(value);
    }
}

/** ------------------------------- **/

class WiCall {

    private _function_name: string = '';
    private _arguments: (WiVariable | WiVariableReference)[] = [];

    get function_name() { return this._function_name; }
    get arguments() { return this._arguments; }

    set_function_name(name: string) {
        if (this._function_name) Error('Cannot redefine function name');
        this._function_name = name;
        return this;
    }

    set_arguments(args: (WiVariable | WiVariableReference)[]) {
        this._arguments = args;
        return this;
    }

}

/** ------------------------------- **/

class WiVariableReference {
    readonly name: string;
    readonly scope: WiTree;
    constructor(name: string, scope: WiTree) {
        this.scope = scope;
        this.name = name;
        if (!this.scope.body.some(n => n instanceof WiVariable && n.name === this.name)) throw `Variable ${name} not found in scope`  // TODO: Log(`Variable ${this.name} not found in scope`);
    }

    get value(): any {
        const variable = this.scope.body.find(n => n instanceof WiVariable && n.name === this.name) as WiVariable;
        return variable.value;
    }

    get type() {
        const variable = this.scope.body.find(n => n instanceof WiVariable && n.name === this.name) as WiVariable;
        return variable.type;
    }
}

/** ------------------------------- **/

export type WiTree = {
    body: WiNode[],
}

/** ------------------------------- **/

export default function Parse(tokens: Token[], file: string) {

    function End() {
        if(process.argv.includes('-d')) writeFileSync('./.tree.json', JSON.stringify(program, null, 2));
    }

    /** ------------------------------- **/

    function Log(reason: string, type: 'error' | 'warning' | 'info') {

        let position = (tokens[index]?.position ?? file.length);

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

            if (i == position) finish_at_line = true;
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
        console.log(colour(`${Chalk.whiteBright('[') + colour(symbol) + Chalk.whiteBright(']')} ${filename}:${line_no + 1}:${position}`));
        console.log('\t' + line)
        console.log('\t' + ' '.repeat(line_index) + colour('^'));
        console.log('\n' + colour(reason));
        if (type === 'warning') return;

        console.log(`at ${'global'}\n`); // ToDo: Stack trace
        if (process.argv.includes('-vv')) console.trace('Compiler trace');

        if (type === "error") process.exit(1);

    }

    /** ------------------------------- **/

    const program: WiTree = { body: [] };
    let index = 0;

    /** ------------------------------- **/

    function Expect(...types: Token['type'][]): Token[] {

        let buffer = tokens.slice(index).slice(0, types.length);
        if (buffer.some((t, i) => t.type !== types[i])) {
            Log(`Expected ${types.join(', ')} but got ${buffer.map(t => t.type).join(', ')}`, 'error');
        }

        index += types.length;
        return buffer;
    }

    /** ------------------------------- **/

    function EnsureUnique(name: string) {
        if (program.body.some(node => Object.hasOwn(node, 'name') && (node as { name: string }).name === name)) {
            Log(`Variable ${name} already defined`, 'error');
        }
    }

    /** ------------------------------- **/

    function InferTokenType({ type, value }: TokenString | TokenNumeric): WiVariableType {

        if (type === 'TokenString') return 'string';
        else if (type === 'TokenNumeric') {
            // TODO: Better detection of numeric types
            if (value.includes('.')) return 'f64';
            else return 'i64';
        }

        Log(`Unable to infer variable type of '${type}'`, 'error');
        return 'object';
    }

    /** ------------------------------- **/

    function InferLiteralType(value: any): WiVariableType {
        // TODO: What is this lol
        value = value.toString();
        if (value.includes('.')) return 'f64';
        else return 'i64';
    }

    /** ------------------------------- **/

    function CreateAnonymousVariable(value: TokenString | TokenNumeric): WiVariable {
        const type = InferTokenType(value);
        return new Variables[type](type)
            .set_name('Anonymous')
            .set_value(value.value);
    }

    /** ------------------------------- **/

    function CalculateValue(value: (TokenString | TokenNumeric | TokenIdentifier)[]): any {

        function ParseIdentifier(identifier: TokenIdentifier, prev?: WiVariable, next?: WiVariable) {
            // Check if identifier can be described by prior variable action
            const action = prev && Object.entries(prev?.actions).find(([_, a]) => a.literal_syntax && a.literal_syntax === identifier.value);
            if (!action) return new WiVariableReference(identifier.value, program);

            const action_value = (prev as { [key: string]: any })[action[0]](next?.value);
            return new Variables[prev.type](prev.type)
                .set_name('Anonymous')
                .set_value(action_value);
        }

        let coarse =
            value.map(v => {
                if (v.type === 'TokenIdentifier') return v;
                else return CreateAnonymousVariable(v);
            })

        let fine: (WiVariable | WiVariableReference | TokenIdentifier | undefined)[] = coarse;
        for (let i = 0; i < coarse.length; i++) {

            const prev = fine[i - 1];
            const next = fine[i + 1];

            if (fine[i] && (fine[i] as TokenIdentifier).type === 'TokenIdentifier') {
                fine[i] = ParseIdentifier(fine[i] as TokenIdentifier, prev instanceof WiVariable ? prev : undefined, next instanceof WiVariable ? next : undefined);
                fine[i - 1] = undefined;
                fine[i + 1] = undefined;
            }
        }

        let final = fine.filter(f => f !== undefined) as (WiVariable | WiVariableReference)[];

        if (final.length > 1) {
            Log(`Unable to reduce expression to single value`, 'error');
        }
        return final[0].value;

    }

    /** ------------------------------- **/


    function Parse(): WiNode {
        const token = tokens[index];

        // Variable Declaration
        if (token.type === 'TokenDeclaration') {
            index++;

            // get variable name
            let [name] = Expect('TokenIdentifier', 'TokenAssigner') as [TokenIdentifier, TokenAssigner];

            // store type
            let type: WiVariableType = 'object';

            let calculable: (TokenString | TokenIdentifier | TokenNumeric | TokenTypeDescriptor)[] = [];
            let current = tokens[index];

            // fetch all calculable tokens fot value
            while (current.type !== 'TokenEnd') {
                if (!['TokenString', 'TokenNumeric', 'TokenIdentifier', 'TokenTypeDescriptor'].includes(current.type)) Log(`Unexpected incalculable token '${current.type}'`, 'error');
                calculable.push(current as TokenString | TokenIdentifier | TokenNumeric | TokenTypeDescriptor);
                current = tokens[++index];
            }

            // explicit type
            if (calculable.at(-2)?.type === 'TokenTypeDescriptor') {
                let type_ = (calculable.at(-1) as TokenIdentifier).value;
                if (!type_) Log(`Invalid type descriptor for variable '${name.value}'`, 'error');
                if (!Object.keys(Variables).includes(type_)) Log(`Unknown type '${type_}'`, 'error');
                type = type_ as WiVariableType;
                calculable = calculable.slice(0, -2);
            }

            // calculate value
            if (calculable.some(t => t.type === 'TokenTypeDescriptor')) Log(`Unexpected type descriptor`, 'error');
            let value = CalculateValue(calculable as (TokenString | TokenNumeric | TokenIdentifier)[]);

            // implicit type
            if (type === 'object') type = InferLiteralType(value);

            // check if variable already exists
            EnsureUnique(name.value);

            // wait for semicolon
            Expect('TokenEnd');

            // create variable
            return new Variables[type](type)
                .set_name(name.value)
                .set_value(value);

        }

        // Identifier (function call)
        if (token.type === 'TokenIdentifier' && tokens[index + 1].type === 'TokenOpenParen') {

            const [function_name] = Expect('TokenIdentifier', 'TokenOpenParen') as [TokenIdentifier];
            let function_arguments: (TokenString | TokenNumeric | TokenIdentifier)[] = [];

            while (true) {
                let argument = tokens[index++];
                if (argument.type === 'TokenCloseParen') break;

                if (['TokenIdentifier', 'TokenString', 'TokenNumeric'].includes(argument.type)) {
                    function_arguments.push(argument as TokenString | TokenNumeric | TokenIdentifier);
                    if (tokens[index].type === 'TokenSeparator') index++;
                } else {
                    Log(`Expected argument but got ${argument.type}`, 'error');
                }

            }

            // check if variable already exists
            EnsureUnique(function_name.value);
            return new WiCall()
                .set_arguments(function_arguments.map(t => t.type === 'TokenIdentifier' ? new WiVariableReference(t.value, program) : CreateAnonymousVariable(t)))
                .set_function_name(function_name.value);

        }

        Log(`Unexpected token '${JSON.stringify(token)}'`, 'error');
        throw '';
    }

    /** ------------------------------- **/

    while (index < tokens.length) {
        program.body.push(Parse())
    }

    /** ------------------------------- **/

    End();
    return program;

}