# aws-ssm-dotenv

Simple CLI utility for generating `.env` files from parameters stored on` AWS SSM`.

# Installation

```bash
yarn add aws-ssm-dotenv
```

# Usage
Create a file called parameters.json

```json
{
  "VAR_ONE": "/var/${Env}/one",
  "VAR_TWO": "/var/two"
}

```
The object keys represent the name of the variable in the resulting `.env` file, the values represent the keys of the SSM parameter.

Basic interpolation is supported by using the `${VarName}` syntax. The variables are substituted by value passed via `--parameters Env=dev`


```
aws-ssm-dotenv --parameters-file parameters.json --parameters Env=dev --output-file .env --region eu-central-1
```

The resulting `.env` file looks like:

```
VAR_ONE=value-var-one
VAR_TWO=value-var-two
```
