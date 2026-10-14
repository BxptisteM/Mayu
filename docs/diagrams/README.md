# Diagrams

| Files                                  | Purpose                                                                                               |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `architecture.mmd`                     | Editable Mermaid component flowchart                                                                  |
| `data-model.mmd`                       | Editable Mermaid schema and physical foreign-key relationships, including optional source association |
| `architecture.dot`                     | Graphviz source for the architecture PNG and SVG                                                      |
| `data-model.dot`                       | Graphviz source for the data model PNG and SVG; simplified `1:N` labels do not express FK nullability |
| `architecture.png`, `architecture.svg` | Rendered architecture views                                                                           |
| `data-model.png`, `data-model.svg`     | Rendered table and physical foreign-key views                                                         |

The architecture arrows show dependencies and data movement, not one mandatory sequence for every publication. Only RSS article publication uses the AI summary dependency; GitHub and podcast publications send metadata embeds without AI. Personal Markdown briefings also use AI. Mermaid is maintained separately from Graphviz; update both sources when changing shared content.

These are component and entity-relationship diagrams. Most Mayu runtime components are functions and services rather than classes. The data model shows physical foreign keys; logical discovery/publication identities are explained in [Data model](../DATA_MODEL.md).

To regenerate the checked-in images, install Graphviz (`dot`) and run these commands from the repository root:

```bash
dot -Tpng docs/diagrams/architecture.dot -o docs/diagrams/architecture.png
dot -Tsvg docs/diagrams/architecture.dot -o docs/diagrams/architecture.svg
dot -Tpng docs/diagrams/data-model.dot -o docs/diagrams/data-model.png
dot -Tsvg docs/diagrams/data-model.dot -o docs/diagrams/data-model.svg
```

The commands render the `.dot` sources. GitHub can render Mermaid fenced blocks in Markdown; `.mmd` files are editable sources and are not inputs to `dot`.
