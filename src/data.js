var data = {
  "title": "Hive 2 Regex SerDe",
  "description": "Testing hive 2.x regex serde.",
  "author": "Regexpress",
  "version": "1",
  "keyword": [
    "java", "hive"
  ],
  "hasDebugOutput": false,
  "properties": [
    {
      "name": "input.regex",
      "type": "string",
      "placeholder": "(0[0-9]{2})-([0-9]{3,4})-([0-9]{3,4})",
	  "default": "",
      "help" : "Regex string.",
	  "required" : true
    },
    {
      "name": "columns",
      "type": "string",
      "placeholder": "A B C",
	  "default": "",
      "help" : "Whitepsace seperated column list.",
	  "required" : true
    },
    {
      "name": "columns.types",
      "type": "string",
      "placeholder": "STRING,STRING,STRING",
	  "default": "",
      "help" : "Comma seperated column type list.",
	  "required" : true
    },
    {
      "name": "input.regex.case.insensitive",
      "type": "boolean",
      "placeholder": "",
	  "default": "",
      "help" : "Determine regex case insensitive.",
	  "required" : false
    },
	{
      "name": "Test Type",
      "type": "list",
      "list" : {
          "a" : "Type A",
          "b" : "Type B"
      },
      "placeholder": "",
	  "default": "",
      "help" : "Type."
    }
  ]
}