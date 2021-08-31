#!/usr/bin/env node

const { program } = require("commander");
const path = require("path");
const fs = require("fs/promises");
const workingDir = process.cwd();
const { SSMClient, GetParameterCommand }= require("@aws-sdk/client-ssm")
program.option("-f --parameters-file [parametersFile]>", "The file containing the parameter definition", path.resolve(workingDir, "parameters.json"))
    .option("-p --parameters [parameters...]", "The parameters to substitute")
    .option("-o --output-file [outputFile]", "The filename of the generate .env file", path.resolve(workingDir, ".env"))
    .option("-r --region [region]", "The AWS region SSM resides in", "eu-central-1")

async function main() {
    await program.parseAsync(process.argv);

    const options = program.opts();

    const ssm = new SSMClient({
        region: options.region
    })

    let parametersFile;

    try {
        parametersFile = await fs.readFile(options.parametersFile);
    } catch (e) {
        console.log(`The parameters file ${options.parametersFile} does not exist`);
        return;
    }

    let parametersDefinition;

    try {
        parametersDefinition = JSON.parse(parametersFile)
    } catch (e) {
        console.log("The parameters file is no valid json");
        return;
    }

    const parameters = parseParameters(options.parameters);


    if (!parametersDefinition || typeof (parametersDefinition) !== "object") {
        console.log("The parameter definition is no valid json");
        return;
    }

    const substitutedParameters = substituteVariables(parametersDefinition, parameters);

    const finalParameters = await getSsmParameters(ssm, substitutedParameters);
    await writeEnvFile(finalParameters, options.outputFile);
}

async function getSsmParameters(client, params) {
    console.log(params);
    const result = {};
    await Promise.all(Object.keys(params)
        .map((key) => client.send(new GetParameterCommand({
                Name: params[key]
            }))
                .then(response => {
                    result[key] = response.Parameter.Value;
                })
        ));

    return result;
}

async function writeEnvFile(params, destination) {
    const content = Object.keys(params).map(p => `${p}=${params[p]}`)
        .join("\n");

    await fs.writeFile(destination, Buffer.from(content));
}

function substituteVariables(variables, params) {
    const substitutedVariables = {};
    const variableExpr = /\$\{\w+\}/g;
    Object.keys(variables)
        .forEach((key) => {
            const value = variables[key];
            const v = [];
            let variable;
            do {
                variable = variableExpr.exec(value);

                if (variable) {
                    v.push({
                        text: variable[0],
                        name: variable[0].substr(2, variable[0].length - 3)
                    })
                }
            } while (variable);

            let result = value;

            for (const vv of v) {
                if (!params[vv.name]) {
                    throw new Error("Variable " + vv.name + " is not defined");
                }
                result = result.replace(vv.text, params[vv.name])
            }

            substitutedVariables[key] = result;
        });

    return substitutedVariables;
}


function parseParameters(params) {
    if (!params) {
        return {};
    }

    return params.map(p => p.split("="))
        .reduce((result, [key, value]) => {
            result[key] = value;
            return result;
        }, {})
}

main().catch(console.log);
