
# headless-zeus-address

###  Introduction
This module allows an O<sub>byte</sub> headless node to work with a Zeus address created by [Obyte-zeus](https://github.com/Papabyte/obyte-zeus) web-app. 

It is similar to headless-wallet module but has these restrictions:
- single-address only
- no device address, so no communication with other devices
- no handling of private assets or shared addresses
- transactions can be posted only by low-level functions from composer module

A node that is only a witness or an oracle that posts datafeeds should be compatible.

### Switch from an existing address
If you already have a node running and want to convert it to a Zeus address, choose `Create a set of keys for an existing address` when using the web app. You will get a script `definition_change.js` that has to be executed from your existing node folder to broadcast the new definition of your address.

 ### Usage
 
- Add the repository as dependency in your package.json and update with NPM.
- Require `headless-zeus-address` module instead of the usual `headless-obyte` 
- Put the `.prod` file provided by [Obyte-zeus](https://github.com/Papabyte/obyte-zeus) in your ~/.config/appName folder, if folder doesn't exist, start your application a first time to create it.
-  Start your application, enter the passphrase that was given with the .prod file
- Check [https://github.com/Papabyte/headless-zeus-address/blob/master/play/create_payment.js](https://github.com/Papabyte/headless-zeus-address/blob/master/play/create_payment.js) to see how to create a payment with the composer.