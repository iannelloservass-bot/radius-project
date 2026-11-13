# Configuratore Soffitti Radianti — aggiornamenti

Questo repository serve **solo** a distribuire le nuove versioni del programma *Configuratore Soffitti Radianti*.
Il codice sorgente non è pubblicato qui.

Ogni release contiene due file:

| File | Contenuto |
|---|---|
| `radius-project_install.exe` | setup per Windows 11 |
| `versione.json` | manifesto **firmato** (Ed25519): versione, note, impronta SHA-256 e dimensione del setup |

## Come funziona

1. Il programma installato controlla l'ultima release (sezione **Aggiornamenti**, oppure in automatico una volta al giorno).
2. Verifica la **firma** del manifesto con la chiave pubblica incorporata e, dopo il download, l'**impronta** del setup:
   un file alterato viene scartato.
3. Il nuovo setup si installa sopra quello precedente: **licenza, progetti, listini e prezzari restano al loro posto**.

Per assistenza rivolgersi al fornitore del programma.
