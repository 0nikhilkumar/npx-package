#!/usr/bin/env node

import fs from "fs";
import inquirer from "inquirer";
import { getLatestVersion } from "./getLatestVersion/latestVersion.js";
import chalk from "chalk";

const questions = [
  {
    type: "input",
    name: "name",
    message: "Enter project name:",
    default: "myapp",
  },
  {
    type: "confirm",
    name: "useCors",
    message: "Do you want to enable CORS?",
    default: false,
  },
  {
    type: "confirm",
    name: "useErrorHandler",
    message: "Do you want to use a basic error handler?",
    default: true,
  },
  {
    type: "confirm",
    name: "useEnvFile",
    message: "Do you want to use an environment file?",
    default: true,
  },
];

const jsErrorMiddleware = `import {envMode} from "../app.js"

export const errorMiddleware = (err, req, res, next)=> {

  err.message = err.message || "Internal Server Error";
  err.statusCode = err.statusCode || 500;
  
  const response = {
    success: false,
    message: err.message,
  };

  if (envMode === "DEVELOPMENT") {
    response.error = err;
  }

  return res.status(err.statusCode).json(response);
};
`;

const jsErrorHandler = ` export default class ErrorHandler extends Error {
    constructor(statusCode, message="something went wrong") {
      super(message);
      this.statusCode = statusCode;
    }
}`;

const createApp = async () => {
    try {
        console.log("Create an Express.js project from this CLI TOOL! 🚀");
        const answer = await inquirer.prompt(questions);

        const projectName = answer.name;
        const projectDir = `./${projectName}`;
        const fileExtension = "js";

        if(!fs.existsSync(projectDir)){
            fs.mkdirSync(projectDir);
            fs.mkdirSync(`${projectDir}/routes`)
            fs.mkdirSync(`${projectDir}/controllers`)
            fs.mkdirSync(`${projectDir}/utils`)
            fs.mkdirSync(`${projectDir}/middlewares`)
            fs.mkdirSync(`${projectDir}/lib`)
            fs.mkdirSync(`${projectDir}/tests`)
        }

        if(answer.useErrorHandler){
            fs.writeFileSync(`${projectDir}/middlewares/error.js`, jsErrorMiddleware);
            fs.writeFileSync(`${projectDir}/utils/errorHandler.js`, jsErrorHandler);
        }

        const importLines = [`import express from "express";`];
        const middlewareLines = [
            `app.use(express.json());`,
            `app.use(express.urlencoded({extended: true}));`,
        ];

        if(answer.useCors){
            importLines.push(`import cors from "cors"`);
            middlewareLines.push(`app.use(cors({origin: '*', credentials: true}))`);
        }

        if(answer.useErrorHandler){
            importLines.push(`import { errorMiddleware } from "./middlewares/error.js"`)
        }

        if(answer.useEnvFile){
            importLines.push(`import dotenv from "dotenv";`);
            const envFileContent = `PORT=5000`;
            fs.writeFileSync(`${projectDir}/.env`, envFileContent);
        }

        const baseFileContent = `${importLines.join("\n")}
        ${answer.useEnvFile ? "dotenv.config({path: './env'});" : ""}
        export const envMode = process.env.NODE_ENV?.trim() || 'DEVELOPMENT';
        const port = process.env.PORT || 3000;

        const app = express();

        ${middlewareLines.join("\n")}

        app.get('/', (req,res) => {
            res.send("Hello World!");
        });

        // your routes here

        app.get("*", (req, res) => {
            res.status(404).json({
                success: false,
                message: 'page not found'
            })
        });

        ${answer.useErrorHandler ? "app.use(errorMiddleware);" : ""}

        app.listen(port, ()=> {
            console.log('Server is working on port:'+port+' in '+envMode+' Mode. ')
        });
        `;

        fs.writeFileSync(`${projectDir}/app.${fileExtension}`, baseFileContent);

        const dependenciesPromise = [getLatestVersion("express")];

        if(answer.useCors) dependenciesPromise.push(getLatestVersion("cors"));
        if(answer.useEnvFile) dependenciesPromise.push(getLatestVersion("dotenv"));

        const devDependenciesPromise = [getLatestVersion("nodemon")];
        
        const dependeciesRaw = await Promise.all(dependenciesPromise);
        const devDependenciesRaw = await Promise.all(devDependenciesPromise);

        const dependecies = dependeciesRaw.map((dependency) => `"${dependency.name}": "${dependency.version}"`);
        const devDependecies = devDependenciesRaw.map((dependency) => `"${dependency.name}": "${dependency.version}"`);

        const npmScriptjs = JSON.stringify({
            start: "set NODE_ENV=PRODUCTION & node app.js",
            dev: "npx nodemon app.js"
        });

        const packageJsonContent = `{
        "name": "${projectName}",
        "version": "1.0.0",
        "description": "",
        "main": "app.js",
        "scripts": ${npmScriptjs},
        "keywords": [],
        "author": "",
        "type": "module",
        "license": "ISC",
        "dependencies": {
            ${dependecies.join(",")}
        },
        "devDependencies": {
            ${devDependecies.join(",")}
        },
    }`;

    fs.writeFileSync(`${projectDir}/package.json`, packageJsonContent);

    console.log("\n");
    console.log(
        chalk.bgWhite(
            chalk.black(`🎉 Project '${projectName}' created successfully! 🎉`)
        )
    );
    console.log("\n");
    console.log(chalk.yellow(chalk.italic("Next Steps:")));
    console.log(chalk.bold(`-> cd ${projectName}`));
    console.log(chalk.bold(`-> npm install \n`));

    console.log(chalk.greenBright(chalk.italic("Start your server: ")));
    console.log(chalk.bold(`1-> npm run dev 🚀\n`));

    } catch (error) {
        console.log(error);
    }
}

createApp().catch((err)=> {
  console.log(err);
})