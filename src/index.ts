import { writeFileSync, readFileSync } from "fs";
import { join } from "path";
import Interpret from "./interpreter";
import Parse from "./parser";
import Tokenize from "./tokenizer";

const file = readFileSync(join(__dirname, '../example.wi'), 'utf8');

const Tree = Parse(Tokenize(file), file);
if(process.argv.includes('-r')) Interpret(Tree);