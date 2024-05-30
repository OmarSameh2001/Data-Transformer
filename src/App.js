import React, { useState } from "react";
import "./App.css";
import "bootstrap/dist/css/bootstrap.min.css";

function App() {
  const [jsonFile, setJsonFile] = useState(null);
  const [csvFile, setCsvFile] = useState(null);
  const [downloadData, setDownloadData] = useState(null);

  const resetValues = () => {
    setJsonFile(null);
    setCsvFile(null);
    setDownloadData(null);
  };

  const handleFileNameChange = (event) => {
    setDownloadData(event.target.value);
  };
  const handleJSONFileChange = (event) => {
    setJsonFile(event.target.files[0]);
  };

  const handleCsvFileChange = (event) => {
    setCsvFile(event.target.files[0]);
  };

  const readFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const parseValue = (value) => {
    if (typeof value === "object" && value !== null) {
      if ("$oid" in value) {
        return value["$oid"];
      } else if ("$date" in value) {
        return new Date(value["$date"]).toISOString();
      }
    }
    return value;
  };

  // Function to transform MongoDB JSON to SQL CSV
  const transformJSONtoCSV = async () => {
    if (jsonFile) {
      try {
        // Read MongoDB JSON file content
        const fileContent = await readFile(jsonFile);
        const jsonData = JSON.parse(fileContent);

        if (jsonData.length === 0) {
          alert("MongoDB JSON is empty");
          return;
        }
        const jsonFlat = jsonData.map((obj) => {
          const flatObj = {};
          for (let key in obj) {
            if (Array.isArray(obj[key])) {
              flatObj[key] = obj[key].map((item) => parseValue(item)).join("-");
            } else {
              flatObj[key] = parseValue(obj[key]);
            }
          }
          return flatObj;
        });

        // Get unique columns and handle nested objects (assuming parseValue handles $oid and $date)
        const columns = [
          ...new Set(
            jsonFlat.flatMap((item) =>
              Object.keys(item).map((col) => {
                const parsedValue = parseValue(item[col]);
                return parsedValue !== item[col]
                  ? `${col}_${parsedValue}`
                  : col;
              })
            )
          ),
        ];
        

        //console.log("Columns:", columns); // Log columns for debugging

        // Create CSV content
        const csvContent = [
          columns.join(","),
          ...jsonFlat.map((item) =>
            columns
              .map((col) => {
                
                return item[col]
              })
              .join(",")
          ),
        ].join("\n");
        console.log("CSV content:", csvContent);

        //console.log("CSV content:", csvContent); // Log CSV content for debugging

        // Trigger download of CSV file
        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = downloadData ? `${downloadData}.csv` : "json_to_csv.csv";
        a.click();
        
      } catch (error) {
        console.error("Error during conversion:", error);
        // Handle errors gracefully, e.g., display an error message to the user
      }
    }
  };

  // Function to transform SQL CSV to MongoDB JSON
  const transformCSVtoJSON = async () => {
    if (csvFile) {
      const fileContent = await readFile(csvFile); // Read SQL CSV file content
      const [headerLine, ...lines] = fileContent
        .split("\n")
        .filter((line) => line.trim());

      const columns = headerLine.split(","); // Extract column names from header
      const jsonData = lines.map((line) => {
        const values = line.split(","); // Split line into values
        const obj = {};
        columns.forEach((col, index) => {
          const [key, subKey] = col.split("_");
          if (subKey) {
            if (!obj[key]) obj[key] = {};
            obj[key][subKey] = parseValue(values[index]); // Parse nested object values
          } else {
            obj[col] = isNaN(values[index])
              ? values[index]
              : parseFloat(values[index]); // Parse normal values
          }
        });
        return obj; // Return constructed object
      });

      // Trigger download of JSON file
      const blob = new Blob([JSON.stringify(jsonData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = downloadData ? `${downloadData}.json` : "csv_to_json.json";
      a.click();
      
    }
  };
  const transformCsvtoSql = async () => {
    if (csvFile) {
      const fileContent = await readFile(csvFile);
      const [headerLine, ...lines] = fileContent
        .split("\n")
        .filter((line) => line.trim());

      const tableName = downloadData ? downloadData : "json_table";
      const columns = headerLine.split(",");

      let createTableSql = `CREATE TABLE ${tableName} (\n`;
      createTableSql += columns
        .map((column) => `${column} VARCHAR(255)`)
        .join(",\n");
      createTableSql += "\n);\n";

      let insertSql = `INSERT INTO ${tableName} (${columns.join(
        ","
      )}) VALUES\n`;

      const valuesSql = lines
        .map((line) => {
          const values = line.split(",");
          const formattedValues = values.map((value) => `'${value}'`).join(",");
          return `(${formattedValues})`;
        })
        .join(",\n");

      insertSql += `${valuesSql};\n`;

      const sqlContent = `${createTableSql}\n${insertSql}`;

      const blob = new Blob([sqlContent], { type: "text/sql" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = downloadData ? `${downloadData}.sql` : "csv_to_sql.sql";
      a.click();
      
    }
  };

  // Function to transform MongoDB JSON to SQL
  const transformJSONtoSQL = async () => {
    if (jsonFile) {
      try {
        // Read MongoDB JSON file content
        const fileContent = await readFile(jsonFile);
        const jsonData = JSON.parse(fileContent);

        if (jsonData.length === 0) {
          alert("JSON is empty.");
          return;
        }

        // Flatten the JSON structure and handle nested arrays
        const flattenedData = jsonData.map((obj) => {
          const flatObj = {};
          for (let key in obj) {
            if (Array.isArray(obj[key])) {
              flatObj[key] = obj[key].map((item) => parseValue(item)).join(",");
            } else {
              flatObj[key] = parseValue(obj[key]);
            }
          }
          return flatObj;
        });
        console.log(flattenedData);

        // Generate SQL INSERT statement from JSON data
        const columns = Object.keys(flattenedData[0])
          .map((key) => `${key} VARCHAR(255)`)
          .join(", ");
        const sqlCreate = `CREATE TABLE ${
          downloadData ? downloadData : "json_table"
        } (${columns});`;
        const sqlContent = `INSERT INTO ${
          downloadData ? downloadData : "json_table"
        } (${Object.keys(flattenedData[0]).join(", ")}) VALUES\n${flattenedData
          .map(
            (obj) =>
              `(${Object.keys(obj)
                .map((col) => `'${parseValue(obj[col])}'`)
                .join(", ")})`
          )
          .join(",\n")};`;
        const completeSQL = `${sqlCreate}\n${sqlContent}`;
        const blob = new Blob([completeSQL], { type: "text/sql" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = downloadData ? `${downloadData}.sql` : "json_to_sql.sql";
        a.click();
        
      } catch (error) {
        console.error("Oh my, an error occurred during the conversion:", error);
      }
    }
  };

  return (
    <div
      className="App d-flex justify-content-center row mx-0 bg-dark py-2"
      style={{ minHeight: "100vh" }}
    >
      <h1 style={{ color: "white", textDecoration: "underline" }}>
        Data Transformer
      </h1>
      <div
        className="card align-items-center col-md-3 m-1 p-1"
        style={{ minWidth: "30vw", maxWidth: "90vw" }}
      >
        <h2>Transform JSON to SQL</h2>
        <img
          src={require("./images/jsontosql.png")}
          className="card-image mb-2"
          style={{ width: "250px", height: "150px", maxWidth: "90%" }}
        />
        <input
          type="file"
          onChange={handleJSONFileChange}
          style={{ maxWidth: "80%" }}
        />
        <input
          type="text"
          placeholder="Enter new file name (optional)"
          style={{ width: "80%", marginTop: "5px" }}
          onChange={handleFileNameChange}
        />
        <button className="btn btn-success mt-1" onClick={transformJSONtoSQL}>
          Transform to SQL query
        </button>
      </div>
      <div
        className="card align-items-center col-md-3 m-1 p-1"
        style={{ minWidth: "30vw", maxWidth: "90vw" }}
      >
        <h2>Transform CSV to SQL</h2>
        <img
          src={require("./images/csvtosql.png")}
          className="card-image mb-2"
          style={{ width: "250px", height: "150px", maxWidth: "90%" }}
        />
        <input
          type="file"
          onChange={handleCsvFileChange}
          style={{ maxWidth: "80%" }}
        />
        <input
          type="text"
          placeholder="Enter new file name (optional)"
          style={{ width: "80%", marginTop: "5px" }}
          onChange={handleFileNameChange}
        />
        <button className="btn btn-success mt-1" onClick={transformCsvtoSql}>
          Transform to SQL query
        </button>
      </div>

      <div
        className="card align-items-center col-md-3 m-1 p-1"
        style={{ minWidth: "30vw", maxWidth: "90vw" }}
      >
        <h2>Transform CSV to JSON</h2>
        <img
          src={require("./images/csvtojson.jpg")}
          className="card-image mb-2"
          style={{ width: "250px", height: "150px", maxWidth: "90%" }}
        />
        <input
          type="file"
          onChange={handleCsvFileChange}
          style={{ maxWidth: "80%" }}
        />
        <input
          type="text"
          placeholder="Enter new file name (optional)"
          style={{ width: "80%", marginTop: "5px" }}
          onChange={handleFileNameChange}
        />
        <button className="btn btn-success mt-1" onClick={transformCSVtoJSON}>
          Transform to JSON
        </button>
      </div>
      <div
        className="card align-items-center col-md-3 m-1 p-1"
        style={{ minWidth: "30vw", maxWidth: "90vw" }}
      >
        <h2>Transform JSON to CSV</h2>
        <img
          src={require("./images/jsontocsv.png")}
          className="card-image mb-2"
          style={{ width: "250px", height: "150px", maxWidth: "90%" }}
        />
        <input
          type="file"
          onChange={handleJSONFileChange}
          style={{ maxWidth: "80%" }}
        />
        <input
          type="text"
          placeholder="Enter new file name (optional)"
          style={{ width: "80%", marginTop: "5px" }}
          onChange={handleFileNameChange}
        />
        <button className="btn btn-success mt-1" onClick={transformJSONtoCSV}>
          Transform to CSV
        </button>
      </div>
    </div>
  );
}

export default App;
