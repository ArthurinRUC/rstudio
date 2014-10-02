/*
 * c_cpp_style_behaviour.js
 *
 * Copyright (C) 2009-12 by RStudio, Inc.
 *
 * The Original Code is Ajax.org Code Editor (ACE).
 *
 * The Initial Developer of the Original Code is
 * Ajax.org B.V.
 * Portions created by the Initial Developer are Copyright (C) 2010
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *      Fabian Jakobs <fabian AT ajax DOT org>
 *      Gastón Kleiman <gaston.kleiman AT gmail DOT com>
 *
 * Based on Bespin's C/C++ Syntax Plugin by Marc McIntyre.
 *
 * Unless you have received this program directly from RStudio pursuant
 * to the terms of a commercial license agreement with RStudio, then
 * this program is licensed to you under the terms of version 3 of the
 * GNU Affero General Public License. This program is distributed WITHOUT
 * ANY EXPRESS OR IMPLIED WARRANTY, INCLUDING THOSE OF NON-INFRINGEMENT,
 * MERCHANTABILITY OR FITNESS FOR A PARTICULAR PURPOSE. Please refer to the
 * AGPL (http://www.gnu.org/licenses/agpl-3.0.txt) for more details.
 *
 */


define('mode/behaviour/cstyle', function(require, exports, module) {

var oop = require("ace/lib/oop");
var Behaviour = require("ace/mode/behaviour").Behaviour;
var CppLookaroundHeuristics = require("mode/cpp_lookaround_heuristics").CppLookaroundHeuristics;

var CStyleBehaviour = function () {

   var $heuristics = new CppLookaroundHeuristics();
   var $complements = $heuristics.$complements;

   var autoPairInsertion = function(text, input, editor, session) {

      var leftChar = text;
      var rightChar = $complements[leftChar];

      if (input == leftChar) {

         var selection = editor.getSelectionRange();
         var selected = session.doc.getTextRange(selection);
         if (selected !== "") {
            return {
               text: leftChar + selected + rightChar,
               selection: false
            };
         } else {
            return {
               text: leftChar + rightChar,
               selection: [1, 1]
            };
         }
      } else if (input == rightChar) {
         var cursor = editor.getCursorPosition();
         var line = session.doc.getLine(cursor.row);
         var cursorRightChar = line[cursor.column];
         if (cursorRightChar == rightChar) {
            var matching = $heuristics.findMatchingBracketRow(
               rightChar,
               session.getDocument().$lines,
               cursor.row,
               200,
               "backward"
            );
            if (matching !== null) {
               return {
                  text: '',
                  selection: [1, 1]
               };
            }
         }
      }
      
   };

   var autoPairDeletion = function(text, range, session) {

      var lChar = text;
      var rChar = $complements[text];
      
      var selected = session.doc.getTextRange(range);
      if (!range.isMultiLine() && selected == lChar) {
         var line = session.doc.getLine(range.start.row);
         var rightChar = line.substring(range.start.column + 1, range.start.column + 2);
         if (rightChar == rChar) {
            range.end.column++;
            return range;
         }
      }
   };
   

   this.add("R", "insertion", function(state, action, editor, session, text) {

      if (text == "R") {

         var cursor = editor.getCursorPosition();
         var line = new String(session.doc.getLine(cursor.row));
         var match = line.match(/^(\s*)\/\*{3,}\s+/);
         if (match) {
            return {
               text: "R\n" + match[1] + "\n" + match[1] + "*/",
               selection: [1, match[1].length, 1, match[1].length]
            };
         }
      }

   });

   this.add("newline", "insertion", function(state, action, editor, session, text) {

      if (text == "\n") {

         // Get some needed variables
         var row = editor.selection.getCursor().row;
         var col = editor.selection.getCursor().column;

         var tab = new Array(session.getTabSize() + 1).join(" ");

         var cursor = editor.getCursorPosition();
         var line = session.doc.getLine(cursor.row);

         if (this.inMacro(session.getDocument().$lines, row - 1)) {
            return;
         }

         // Comment indentation rules
         if (state == "comment" || state == "doc-start") {

            // Choose indentation for the current line based on the position
            // of the cursor -- but make sure we only apply this if the
            // cursor is on the same row as the line being indented
            if (cursor && cursor.row == row) {
               line = line.substring(0, cursor.column);
            }

            // We want to insert stars and spaces to match the indentation of the line.
            // Make sure we trim up to the cursor when necessary.
            var styleMatch = /^(\s*\*+\s*)/.exec(line);
            if (styleMatch) {
               return {
                  text: '\n' + styleMatch[1],
                  selection: [1, styleMatch[1].length, 1, styleMatch[1].length]
               };
            }
            
         }

         // Walk backwards over whitespace to find first non-whitespace char
         var i = col - 1;
         while (/\s/.test(line[i])) {
            --i;
         }
         var thisChar = line[i];
         var rightChar = line[col];

         // If we're creating a namespace, just use the line's indent itself
         var match = line.match(/\s*namespace\s*\w*\s*{/);
         if (match) {
            var indent = this.$getIndent(line);
            return {
               text: '\n' + indent + '\n' + indent,
               selection: [1, indent.length, 1, indent.length]
            };
         }

         // If we're inserting a newline within a newly constructed comment
         // block, insert a '*'.
         if (/^\s*\/\*/.test(line)) {

            var indent = this.$getIndent(line);
            var newIndent = indent + " * ";
            
            return {
               text: "\n" + newIndent + "\n" + indent + " */",
               selection: [1, newIndent.length, 1, newIndent.length]
            };
         }

         // If we're handling the case where we want all function arguments
         // for a function call all on their own line, e.g.
         //
         // foo(
         //   |
         // )
         //
         // then indent appropriately, and put the closing paren on its
         // own line as well.
         if ((thisChar == "(" && rightChar == ")") ||
             (thisChar == "[" && rightChar == "]")) {

            var nextIndent = this.$getIndent(line);
            var indent = nextIndent + tab;
            
            return {
               text: "\n" + indent + "\n" + nextIndent,
               selection: [1, indent.length, 1, indent.length]
            };
         }

         // These insertion rules handle the case where we're inserting a newline
         // when within an auto-generated {} block; e.g. as class Foo {|};
         if (thisChar == '{' && rightChar == "}") {

            // default behavior -- based on just the current row
            var nextIndent = this.$getIndent(line);
            var indent = nextIndent + tab;
            
            return {
               text: "\n" + indent + "\n" + nextIndent,
               selection: [1, indent.length, 1, indent.length]
            };
            
         }

      }
      
   });

   this.add("braces", "insertion", function (state, action, editor, session, text) {

      var row = editor.selection.getCursor().row;
      var col = editor.selection.getCursor().column;
      var line = session.getLine(row);
      var lineTrimmed = line.substring(0, col);
      var commentMatch = line.match(/\/\//);
      if (commentMatch) {
         line = line.substr(0, commentMatch.index - 1);
      }

      if (text == '{') {

         var selection = editor.getSelectionRange();
         var selected = session.doc.getTextRange(selection);
         if (selected !== "") {
            return {
               text: '{' + selected + '}',
               selection: false
            };
         }

         // namespace specific indenting -- note that 'lineTrimmed'
         // does not contain the now-inserted '{'
         var anonNamespace = /\s*namespace\s*$/.test(lineTrimmed);
         var namedNamespace = lineTrimmed.match(/\s*namespace\s+(\S+)\s*/);

         if (namedNamespace) {
            return {
               text: '{} // end namespace ' + namedNamespace[1],
               selection: [1, 1]
            };
         }

         if (anonNamespace) {
            return {
               text: '{} // end anonymous namespace',
               selection: [1, 1]
            };
         }

         // if we're assigning, e.g. through an initializor list, then
         // we should include a semi-colon
         if (line.match(/\=\s*$/)) {
            return {
               text: '{};',
               selection: [1, 1]
            };
         }

         // if we're defining a function, don't include a semi-colon
         if (line.match(/\)\s*/)) {
            return {
               text: '{}',
               selection: [1, 1]
            };
         }

         // if we're making a block define, don't add a semi-colon
         if (line.match(/#define\s+\w+/)) {
            return {
               text: '{}',
               selection: [1, 1]
            };
         }

         // if it looks like we're using a initializor eg 'obj {', then
         // include a closing ;
         // Avoid doing this if there's an 'else' token on the same line
         if (line.match(/[\w>]+\s*$/) && !line.match(/\belse\b/)) {
            return {
               text: '{};',
               selection: [1, 1]
            };
         }

         // If class-style indentation can produce an appropriate indentation for
         // the brace, then insert a closing brace with a semi-colon
         var openBracePos = $heuristics.getRowForOpenBraceIndentClassStyle(
            session, row - 1, 20
         );
         
         if (openBracePos !== null) {
            return {
               text: '{};',
               selection: [1, 1]
            };
         }
         
         // default matching scenario
         return {
            text: '{}',
            selection: [1, 1]
         };

      } else if (text == '}') {
         var cursor = editor.getCursorPosition();
         var line = session.doc.getLine(cursor.row);
         var rightChar = line.substring(cursor.column, cursor.column + 1);
         if (rightChar == '}') {
            var matching = session.$findOpeningBracket('}', {column: cursor.column + 1, row: cursor.row});
            if (matching !== null) {
               return {
                  text: '',
                  selection: [1, 1]
               };
            }
         }
      }
   });

   this.add("braces", "deletion", function (state, action, editor, session, range) {
      var selected = session.doc.getTextRange(range);
      if (!range.isMultiLine() && selected == '{') {
         var line = session.doc.getLine(range.start.row);
         var rightChar = line.substring(range.end.column, range.end.column + 1);
         var rightRightChar =
                line.substring(range.end.column + 1, range.end.column + 2);
         if (rightChar == '}') {
            range.end.column++;
            if (rightRightChar == ';') {
               range.end.column++;
            }
            return range;
         }
      }
   });

   // Note -- we restrict this to 'template' contexts (which we use
   // a very simple heuristic to look up...
   this.add("arrows", "insertion", function (state, action, editor, session, text) {
      var cursor = editor.getCursorPosition();
      var line = session.getDocument().getLine(cursor.row);
      if (/^\s*template/.test(line)) {
         return autoPairInsertion("<", text, editor, session);
      }
   });

   this.add("arrows", "deletion", function (state, action, editor, session, range) {
      return autoPairDeletion("<", range, session);
   });
   

   this.add("parens", "insertion", function (state, action, editor, session, text) {
      return autoPairInsertion("(", text, editor, session);
   });

   this.add("parens", "deletion", function (state, action, editor, session, range) {
      return autoPairDeletion("(", range, session);
   });
   
   this.add("brackets", "insertion", function (state, action, editor, session, text) {
      return autoPairInsertion("[", text, editor, session);
   });

   this.add("brackets", "deletion", function (state, action, edditor, session, range) {
      return autoPairDeletion("[", range, session);
   });

   this.add("string_dquotes", "insertion", function (state, action, editor, session, text) {
      if (text == '"' || text == "'") {
         var quote = text;
         var selection = editor.getSelectionRange();
         var selected = session.doc.getTextRange(selection);
         if (selected !== "") {
            return {
               text: quote + selected + quote,
               selection: false
            };
         } else {
            var cursor = editor.getCursorPosition();
            var line = session.doc.getLine(cursor.row);
            var leftChar = line.substring(cursor.column-1, cursor.column);

            // We're escaped.
            if (leftChar == '\\') {
               return null;
            }

            // Find what token we're inside.
            var tokens = session.getTokens(selection.start.row);
            var col = 0, token;
            var quotepos = -1; // Track whether we're inside an open quote.

            for (var x = 0; x < tokens.length; x++) {
               token = tokens[x];
               if (token.type == "string") {
                  quotepos = -1;
               } else if (quotepos < 0) {
                  quotepos = token.value.indexOf(quote);
               }
               if ((token.value.length + col) > selection.start.column) {
                  break;
               }
               col += tokens[x].value.length;
            }

            // Try and be smart about when we auto insert.
            if (!token || (quotepos < 0 && token.type !== "comment" && (token.type !== "string" || ((selection.start.column !== token.value.length+col-1) && token.value.lastIndexOf(quote) === token.value.length-1)))) {
               return {
                  text: quote + quote,
                  selection: [1,1]
               };
            } else if (token && token.type === "string") {
               // Ignore input and move right one if we're typing over the closing quote.
               var rightChar = line.substring(cursor.column, cursor.column + 1);
               if (rightChar == quote) {
                  return {
                     text: '',
                     selection: [1, 1]
                  };
               }
            }
         }
      }
   });

   this.add("string_dquotes", "deletion", function (state, action, editor, session, range) {
      var selected = session.doc.getTextRange(range);
      if (!range.isMultiLine() && (selected == '"' || selected == "'")) {
         var line = session.doc.getLine(range.start.row);
         var rightChar = line.substring(range.start.column + 1, range.start.column + 2);
         if (rightChar == '"') {
            range.end.column++;
            return range;
         }
      }
   });

   // this.add("comment", "insertion", function (state, action, editor, session, text) {
   //    return text;
   //    if (text == "*") {
   //       var row = editor.selection.getCursor().row;
   //       var line = session.getLine(row);
   //       var indent = this.$getIndent(line);

   //       if (/\s*\/\*$/.test(line)) {
   //          return {
   //             text: '*\n ' + indent + '*/',
   //             selection: [1, 1]
   //          };
   //       }
   //    }
   // });

   this.add("comment", "deletion", function (state, action, editor, session, range) {
      
      return range;

   });

   this.add("punctuation.operator", "insertion", function(state, action, editor, session, text) {
      // Step over ';'
      if (text == ";") {
         var cursor = editor.selection.getCursor();
         var line = session.getLine(cursor.row);
         if (line[cursor.column] == ";") {
            return {
               text: '',
               selection: [1, 1]
            };
         }

      }

   });

   // Provide an experimental 'macro mode' -- this allows for automatic indentation
   // and alignment of inserted '/' characters, and also provides the regular
   // indentation rules for expressions constructed within a macro.
   this.add("macro", "insertion", function(state, action, editor, session, text) {

      var backslashAlignColumn = 62;

      // Get some useful quantities
      var lines = session.getDocument().$lines;
      var cursor = editor.getCursorPosition();
      var row = cursor.row;
      var line = lines[row];
      var lineSub = line.substring(0, cursor.column);

      // Enter macro mode: we enter macro mode if the user inserts a
      // '\' after a '#define' line.
      if (/^\s*#\s*define[^\\]*$/.test(line) && text == "\\") {

         var len = backslashAlignColumn - lineSub.length + 1;

         if (len >= 0) {
            return {
               text: new Array(len + 1).join(" ") + "\\\n" + session.getTabString(),
               selection: false
            };
         } else {
            return {
               text: "\\\n" + session.getTabString(),
               selection: false
            };
         }
      }

      // Special rules for 'macro mode'.
      if (/^\s*#\s*define/.test(line) || this.inMacro(lines, row - 1)) {

         // Handle insertion of a '\'.
         //
         // If there is only whitespace following the cursor, then
         // we try to nudge out the inserted '\'. Note that we
         // have some protection in this outdenting because of the
         // automatic matching done by '', "" insertion (which is the
         // only other context where we would expect a user to insert '\')
         if (text == "\\" &&
             (/^\s*$/.test(line.substring(lineSub.length, line.length)))) {
                
            var len = backslashAlignColumn - lineSub.length + 1;

            if (len >= 0) {
               return {
                  text: new Array(len + 1).join(" ") + "\\",
                  selection: false
               };
            } else {
               return {
                  text: "\\",
                  selection: false
               };
            }
         }

         // Newlines function slightly differently in 'macro mode'.
         // When a newline is inserted, we automatically add in an aligned
         // '\' for continuation if the line isn't blank.
         // If we try to insert a newline on a line that already has a
         // closing '\', then we just move the cursor down.
         if (text == "\n") {

            // Leave the macro if the line is blank. This provides an
            // escape hatch for '\n'.
            if (/^\s*$/.test(line)) {
               return {
                  text: "\n",
                  selection: false
               };
            }

            // Check if we already have a closing backslash to the right of the cursor.
            // This rule makes enter effectively function as a 'move down' action, e.g.
            // pressing the down arrow on the keyboard.
            if (/\\\s*$/.test(line) && !/\\\s*$/.test(lineSub)) {
               return {
                  text: '',
                  selection: [1, cursor.column, 1, cursor.column]
               };
            }

            // Otherwise, on enter, push a '\' out to an alignment column, so that
            // macros get formatted in a 'pretty' way.
            var nextIndent = session.getMode().getNextLineIndent(
               state,
               line + "\\",
               session.getTabString(),
               session.getTabSize(),
               row,
               false
            );
            
            var len = backslashAlignColumn - lineSub.length + 1;
            var backSlash = /\\\s*$/.test(lineSub) ?
                   "" :
                   "\\";

            if (len >= 0) {
               return {
                  text: new Array(len + 1).join(" ") + backSlash + "\n" + nextIndent,
                  selection: false
               };
            } else {
               return {
                  text: backSlash + "\n" + nextIndent,
                  selection: false
               };
            }
         }
      }
      
   });

};

oop.inherits(CStyleBehaviour, Behaviour);

exports.CStyleBehaviour = CStyleBehaviour;
});
