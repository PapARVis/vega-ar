# PapARVis: Vega AR 
(the authors are busy working on CHI submission, will come back to clean the code later)

Vega AR consists of 2 main parts: AR Parse and AR View (Validator and AR-Preview).

## AR Parse
AR Parse extends Vega Parse to support parsing Vega specification with additional AR block into 2 Vega Runtimes for static visualization (V<sub>s</sub>) and augmented visualization (V<sub>ar</sub>).
## AR View
AR View is built on top of Vega View which handle layouts, validation and preview of the augmented visualization. It contains the Validator to check whether the current visual design is valid or not by verifying the dataflow of the design. The Validator helps the designers to validate if the visual mapping is consistence before and after augmenting the V<sub>s</sub>. A augmented static visualization is valid when the visual mapping between V<sub>s</sub> and V<sub>ar</sub> remains the same.

Moreover, it contains the AR-Preview to show the V<sub>ar</sub> during the development. The AR-Preview is designed to avoid the frequently switching between devices. Designers are not required to see the result of the V<sub>ar</sub> under AR Viewer while observing the changes of the V<sub>s</sub> in the website.

## How to use
### Build the Javascript
1. Install dependencies: ```yarn```
2. Build ```vega-ar.js```: ```yarn build```
