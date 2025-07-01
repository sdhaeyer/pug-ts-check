

export interface PugAstNode {
    type: string;
    line?: number;
    filename?: string;

    // Tag-specific
    name?: string;
    attrs?: Array<{name: string; val: string}>;
    block?: PugAstNode;
    nodes?: PugAstNode[];

    // Code
    val?: string;

    // Each
    obj?: string;
    key?: string;
    valName?: string; // note: val is usually the loop variable

    // Block
    blockName?: string;

    // Mixin
    args?: string;

    // Children
    [key: string]: any;
}

export interface PugAst {
    type: "Block";
    nodes: PugAstNode[];
}