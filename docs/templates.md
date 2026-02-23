# Templates LaTeX — Consignes et pièges

Ce document décrit les règles à respecter pour ajouter/modifier un template LaTeX, et les pièges qui provoquent des erreurs de compilation.

## Contexte
Le backend rend les templates via Jinja2 (délimiteurs `\BLOCK{...}` et `\VAR{...}`) puis compile avec `latexmk` et `pdflatex`.

## Règles indispensables

1. **Toujours séparer les commandes de style du texte injecté**
   - Les commandes `\bfseries`, `\large`, `\small`, `\footnotesize`, etc. **doivent être suivies d’un espace** ou d’un groupe `{...}`.
   - Exemples OK :
     - `\large \VAR{personal.title | escape_latex}`
     - `\textbf{\VAR{personal.name | escape_latex}}`
   - Exemples KO (cassent LaTeX) :
     - `\large\VAR{...}` → devient `\largeEngineer`
     - `\bfseries\VAR{...}` → devient `\bfseriesJohn`

2. **Préférer `\textbf{...}` aux styles “nus”**
   - Plus sûr qu’un simple `\bfseries` suivi de texte.
   - Exemple recommandé : `\textbf{\VAR{section.title | escape_latex}}`

3. **Toujours utiliser `escape_latex` sur les champs texte**
   - Ex : `\VAR{personal.email | escape_latex}`
   - Sans ça, caractères spéciaux (`_`, `&`, `%`, `#`, `$`) cassent LaTeX.

4. **Séparer les commandes de couleur et le texte**
   - Exemple recommandé : `{\color{accentcolor}\textbf{\VAR{...}}}`
   - Éviter : `\color{accentcolor}\VAR{...}` sans groupe (plus fragile).

5. **Les URL doivent rester valides**
   - Dans `\href{...}{...}`, l’URL et le label doivent être échappés.
   - Exemple : `\href{\VAR{link.url | escape_latex}}{\VAR{link.username | escape_latex}}`

6. **Ne pas introduire de commandes LaTeX dynamiques**
   - Jamais de `\VAR{...}` qui injecte des commandes LaTeX.
   - Les données utilisateur doivent rester du texte pur.

## Pièges fréquents

- **Collage de commandes** : `\small\VAR{...}` provoque `\smallalexandre` → erreur “Undefined control sequence”.
- **Styles multiples sans groupement** : `\large\bfseries\color{...}\VAR{...}` est fragile.
- **Accolades manquantes** autour de blocs stylés.
- **Caractères non échappés** (`_`, `#`, `%`) dans emails/URLs.

## Checklist avant d’ajouter un template

1. Tous les champs `\VAR{...}` ont `| escape_latex`.
2. Pas de séquences `\large\VAR` / `\small\VAR` / `\bfseries\VAR`.
3. Les styles sont groupés ( `{...}` ) ou via `\textbf{...}`.
4. Le template compile localement avec un CV “complet” (long texte + caractères spéciaux).

## Debug en cas d’erreur

- Les erreurs LaTeX remontent dans la réponse `Erreur de compilation LaTeX: ...`.
- En cas d’échec, le backend conserve le dossier `/tmp/cv_*` avec `main.tex` et `main.log`.
- Exemple pour analyser dans le container :

```bash
# Trouver le dossier conservé dans les logs
# Puis inspecter main.tex / main.log
cat /tmp/cv_xxxxx/main.tex
cat /tmp/cv_xxxxx/main.log
```
