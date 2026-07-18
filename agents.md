# ARANDU - CORE ARCHITECTURE RULES
You are an expert Angular 18 developer. You must strictly follow these rules for every code modification:

1. **Framework:** Use Angular 18 strictly with Standalone Components. NgModules are forbidden.
2. **State Management:** Use Angular Signals (`signal`, `computed`, `effect`) exclusively for component state. 
3. **Strict UI DOM:** The DOM structure of the public view MUST mathematically match the Builder preview canvas (WYSIWYG).
4. **Scroll Discipline:** Nested scrolling is forbidden. The main view must use `overflow-x-hidden`. Never inject `overflow-auto` into child text containers.
5. **No Hallucinations:** Do not add external dependencies (like Node.js servers or Python scripts) unless explicitly requested. Use vanilla TS/JS within the Angular ecosystem.
