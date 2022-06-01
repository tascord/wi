#include <cctype>
#include <cstdio>
#include <cstdlib>
#include <map>
#include <memory>
#include <string>
#include <utility>
#include <vector>
#include <iostream>

using namespace std;

/** ------------------------------------------- */

enum Token
{

    /* Meta */
    FILE_END = -1, // End of file | tok_eof

    /* Commands */
    FN_DEF = -2, // Function keyword | tok_def
    EXPORT = -3, // Export keyword | tok_extern

    /* Literals */
    IDENTIFIER = -4, // Identifier | tok_identifier
    STRING = -5,     // String literal |
    NUMBER = -6,     // Number literal | tok_number

};

static std::string Identifier;  // Identifier value | IdentifierStr
static double NumericalValue;   // Numerical value | NumVal
static std::string StringValue; // String value |
static std::string DebugValue = "";

static int GetToken()
{
    static int LastChar = ' ';

    /** ------------------------------------------- */

    // Single line comments
    if (LastChar == '/' && getchar() == '/')
    {
        cout << "[Lexer] | Skipping single line comment" << endl;
        while (LastChar != '\n')
        {
            LastChar = getchar();
        }
        return GetToken();
    }

    // Multi-line comments
    if (LastChar == '/' && getchar() == '*')
    {
        cout << "[Lexer] | Skipping multi line comment" << endl;
        while (LastChar != '*' || getchar() != '/')
            LastChar = getchar();
        LastChar = getchar();
        return GetToken();
    }

    /** ------------------------------------------- */

    // Skip whitespace
    while (isspace(LastChar))
    {
        cout << "[Lexer] | Skipping whitespace" << endl;
        LastChar = getchar();
    }

    /** ------------------------------------------- */

    // Look for alphanumeric characters
    if (isalpha(LastChar))
    {
        cout << "[Lexer] | Reading alphanumeric" << endl;
        Identifier = LastChar;
        while (isalnum(LastChar = getchar()))
            Identifier += LastChar;

        // Function definition
        if (Identifier == "fn")
            return FN_DEF;

        // Export keyword
        if (Identifier == "export")
            return EXPORT;

        // Fallback
        return IDENTIFIER;
    }

    // Look for numbers
    if (isdigit(LastChar) || LastChar == '.')
    {
        cout << "[Lexer] | Reading number" << endl;
        std::string Number;
        do
        {
            Number += LastChar;
            LastChar = getchar();
        } while (isdigit(LastChar) || LastChar == '.');

        NumericalValue = std::stod(Number);
        DebugValue = 
        return NUMBER;
    }

    // Look for strings
    if (LastChar == '"')
    {
        cout << "[Lexer] | Reading String" << endl;
        StringValue = "";
        LastChar = getchar();
        while (LastChar != '"')
        {
            StringValue += LastChar;
            LastChar = getchar();
        }
        LastChar = getchar();
        DebugValue = ;
        return STRING;
    }

    /** ------------------------------------------- */

    // End of file
    if (LastChar == EOF)
    {
        cout << "[Lexer] | Reading EOF" << endl;
        return FILE_END;
    }

    // Fallback to ASCII
    int Char = LastChar;
    LastChar = getchar();

    cout << "[Lexer] | Falling back" << endl;
    return Char;
}

/** ------------------------------------------- */

// Node | ExprAST
class Node
{
public:
    virtual ~Node() {}
};

// Numerical | NumberExprAST
class Numerical : public Node
{
    double Value;

public:
    Numerical(double Value) : Value(Value) {}
};

// String |
class String : public Node
{
    std::string Value;

public:
    String(std::string Value) : Value(Value) {}
};

// Variable | VarExprAST
class Variable : public Node
{
    std::string Name;

public:
    Variable(const std::string &Name) : Name(Name) {}
};

// Binary operation | BinaryExprAST
class Binary : public Node
{
    char Operator;
    std::unique_ptr<Node> Left, Right;

public:
    Binary(char op, std::unique_ptr<Node> left, std::unique_ptr<Node> right) : Operator(op), Left(std::move(left)), Right(std::move(right)) {}
};

// Call expression | CallExprAST
class Call : public Node
{
    std::string Initiator;
    std::vector<std::unique_ptr<Node>> Arguments;

public:
    Call(const std::string &Initiator, std::vector<std::unique_ptr<Node>> Arguments) : Initiator(Initiator), Arguments(std::move(Arguments)) {}
};

/** ------------------------------------------- */

// Function prototype | PrototypeAST
class Prototype
{
    std::string Name;
    std::vector<std::string> Args;

public:
    Prototype(const std::string &name, std::vector<std::string> Args) : Name(name), Args(std::move(Args)) {}
    const std::string &getName() const { return Name; }
};

// Function | FunctionAST
class Function
{
    std::unique_ptr<Prototype> Proto;
    std::unique_ptr<Node> Body;

public:
    Function(std::unique_ptr<Prototype> Proto, std::unique_ptr<Node> Body) : Proto(std::move(Proto)), Body(std::move(Body)) {}
};

/** ------------------------------------------- */

static int CurrentToken;
static int GetNextToken()
{
    return CurrentToken = GetToken();
}

/** ------------------------------------------- */

std::unique_ptr<Node> Error(const std::string &Message)
{
    std::cout << "Error: " << Message << std::endl;
    return nullptr;
}

std::unique_ptr<Prototype> ErrorPrototype(const std::string &Message)
{
    std::cout << "Error: " << Message << std::endl;
    return nullptr;
}

/** ------------------------------------------- */

static std::map<char, int> BinaryPriority = {
    {'<', 10},
    {'>', 10},
    {'+', 20},
    {'-', 20},
    {'*', 40},
    {'/', 40},
};

static int GetTokenPriority()
{
    if (!isascii(CurrentToken))
        return -1;

    int Priority = BinaryPriority[CurrentToken];
    if (Priority < 0)
        return -1;

    return Priority;
}

/** ------------------------------------------- */

static std::unique_ptr<Node> ParseExpression();

static std::unique_ptr<Node> ParseNumerical()
{
    auto Result = std::make_unique<Numerical>(NumericalValue);
    GetNextToken();
    return std::move(Result);
}

static std::unique_ptr<Node> ParseString()
{
    auto Result = std::make_unique<String>(StringValue);
    GetNextToken();
    return std::move(Result);
}

static std::unique_ptr<Node> ParseParen()
{
    GetNextToken();
    auto Result = ParseExpression();
    if (!Result)
        return nullptr;
    if (CurrentToken != ')')
        return Error("Expected ')'");
    GetNextToken();
    return Result;
}

static std::unique_ptr<Node> ParseIdentifier()
{
    std::string IdName = Identifier;
    GetNextToken();

    if (CurrentToken != '(')
        return std::make_unique<Variable>(IdName);

    GetNextToken();
    std::vector<std::unique_ptr<Node>> Arguments;
    if (CurrentToken != ')')
    {
        while (true)
        {
            if (auto Arg = ParseExpression())
                Arguments.push_back(std::move(Arg));
            else
                return nullptr;

            if (CurrentToken == ')')
                break;

            if (CurrentToken != ',')
                return Error("Expected ')' or ',' in argument list");
            GetNextToken();
        }
    }

    GetNextToken();
    return std::make_unique<Call>(IdName, std::move(Arguments));
}

static std::unique_ptr<Node> ParsePrimary()
{
    switch (CurrentToken)
    {
    case IDENTIFIER:
        return ParseIdentifier();
    case NUMBER:
        return ParseNumerical();
    case STRING:
        return ParseString();
    case '(':
        return ParseParen();
    default:
        return Error("Unknown token '" + std::to_string(CurrentToken) + "' in expression");
    }
}

static std::unique_ptr<Node> ParseBinaryRight(int Priority, std::unique_ptr<Node> Left)
{
    while (true)
    {
        int TokenPriority = GetTokenPriority();

        if (TokenPriority < Priority)
            return Left;
        else
        {
            int Operation = CurrentToken;
            GetNextToken();

            auto Right = ParsePrimary();
            if (Right)
            {
                int NextPrec = GetTokenPriority();
                if (TokenPriority < NextPrec)
                {
                    Right = ParseBinaryRight(TokenPriority + 1, move(Right));
                    if (!Right)
                        return nullptr;
                }

                Left = make_unique<Binary>(Operation, move(Left), move(Right));
            }
            else
                return nullptr;
        }
    }
}

static std::unique_ptr<Node> ParseExpression()
{
    auto Left = ParsePrimary();

    if (!Left)
        return nullptr;

    return ParseBinaryRight(0, std::move(Left));
}

static std::unique_ptr<Prototype> ParsePrototype()
{
    if (CurrentToken != IDENTIFIER)
        return ErrorPrototype("Expected function name in prototype");

    std::string Name = Identifier;
    GetNextToken();

    if (CurrentToken != '(')
        return ErrorPrototype("Expected '(' in prototype");

    std::vector<std::string> ArgumentNames;
    while (GetNextToken() == IDENTIFIER)
        ArgumentNames.push_back(Identifier);

    if (CurrentToken != ')')
        return ErrorPrototype("Expected ')' in prototype");

    GetNextToken();
    return std::make_unique<Prototype>(Name, std::move(ArgumentNames));
}

static std::unique_ptr<Function> ParseDefinition()
{
    GetNextToken();
    auto Proto = ParsePrototype();
    if (!Proto)
        return nullptr;

    if (auto E = ParseExpression())
        return std::make_unique<Function>(std::move(Proto), std::move(E));
    else
        return nullptr;
}

static std::unique_ptr<Prototype> ParseExport()
{
    GetNextToken();
    return ParsePrototype();
}

static std::unique_ptr<Function> ParseTopLevelExpression()
{
    if (auto E = ParseExpression())
    {
        auto Proto = std::make_unique<Prototype>("", std::vector<std::string>());
        return std::make_unique<Function>(std::move(Proto), std::move(E));
    }
    else
        return nullptr;
}

/** ------------------------------------------- */

static void HandleDefinition()
{
    if (ParseDefinition())
    {
        fprintf(stderr, "Parsed a function definition.\n");
    }
    else
    {
        // Skip token for error recovery.
        GetNextToken();
    }
}

static void HandleExport()
{
    if (ParseExport())
    {
        fprintf(stderr, "Parsed an extern\n");
    }
    else
    {
        // Skip token for error recovery.
        GetNextToken();
    }
}

static void HandleTopLevelExpression()
{
    // Evaluate a top-level expression into an anonymous function.
    if (ParseTopLevelExpression())
    {
        cout << "[Parser] | Parsed a top level expression" << endl;
    }
    else
    {
        // Skip token for error recovery.
        GetNextToken();
    }
}

/** ------------------------------------------- */

static void MainLoop()
{

    cout << "[Loop] | Begin" << endl;

    while (true)
    {
        cout << "[Loop] | CurrentToken: " << CurrentToken  << " Value: " << DebugValue << endl;

        switch (CurrentToken)
        {
        case EOF:
            cout << "[Loop] | EOF Reached :D" << endl;
            return;
        case ';':
            cout << "[Loop] | Semicolon: " << CurrentToken << endl;
            GetNextToken();
            break;
        case FN_DEF:
            cout << "[Loop] | Function Definition: " << CurrentToken << endl;
            HandleDefinition();
            break;
        case EXPORT:
            cout << "[Loop] | Export: " << CurrentToken << endl;
            HandleExport();
            break;
        default:
            cout << "[Loop] | TLE: " << CurrentToken << endl;
            HandleTopLevelExpression();
            break;
        }
    }
}

/** ------------------------------------------- */

int main()
{

    GetNextToken();

    cout << "[Primed & Ready] | Beginning MainLoop" << endl;
    MainLoop();

    return 0;
}