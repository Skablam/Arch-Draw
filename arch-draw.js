function processLinks(json) {

  var serviceIndex = -1;

  //adding links to json

  for (var i = 0; i < json.nodes.length; i++) {

    serviceIndex++;

    service = json.nodes[i];

    for (var j = 0; j < service.dep.length; j++) {

      //find node for dependency
      json.nodes.forEach(function(obj, k){

        if (obj.name == service.dep[j]) {

          var link = {};

          link["source"] = serviceIndex;
          link["target"] = k;
          link["value"] = 1;

          json.links.push(link);

        }

      });

    };

  };


};

function processNodes(service, json) {

  var node = {};

  node["name"] = service.name;
  node["code_url"] = service.code_url;
  node["url"] = service.url;
  node["port"] = service.port;
  node["type"] = service.type;
  node["heroku"] = service.heroku;
  node["database"] = service.database;

  var tech = [];

  for (var j = 0; j < service.tech.length; j++) {

    tech.push(service.tech[j]);

  };

  node["tech"] = tech;

  var dependencies = [];

  for (var j = 0; j < service.dependencies.length; j++) {

    dependencies.push(service.dependencies[j]);

  };

  node["dep"] = dependencies;

  json.nodes.push(node);

};

function loadDataFromFile(data) {

  var json = {"nodes": [], "links": []};

  //adding nodes to json
  for (var i = 0; i < data.production.length; i++) {

    service = data.production[i];

    processNodes(service, json);

  }

  var serviceIndex = -1;

  //adding links to json

  for (var i = 0; i < data.production.length; i++) {

    serviceIndex++;

    service = data.production[i];

    for (var j = 0; j < service.dependencies.length; j++) {

      //find node for dependency
      json.nodes.forEach(function(obj, k){

        if (obj.name == service.dependencies[j]) {

          var link = {};

          link["source"] = serviceIndex;
          link["target"] = k;
          link["value"] = 1;

          json.links.push(link);

        }

      });

    };

  };

  return json;

};

function downloadFile(url, callback) {

  function createCORSRequest(method, url) {
    var xhr = new XMLHttpRequest();
    if ("withCredentials" in xhr) {

      // Check if the XMLHttpRequest object has a "withCredentials" property.
      // "withCredentials" only exists on XMLHTTPRequest2 objects.
      xhr.open(method, url, false);

    } else if (typeof XDomainRequest != "undefined") {

      // Otherwise, check if XDomainRequest.
      // XDomainRequest only exists in IE, and is IE's way of making CORS requests.
      xhr = new XDomainRequest();
      xhr.open(method, url);

    } else {

      // Otherwise, CORS is not supported by the browser.
      xhr = null;

    }
    return xhr;
  }

  var xhr = createCORSRequest('GET', url);
  if (!xhr) {
    throw new Error('CORS not supported');
  }

  // Response handlers.
  xhr.onload = function() {
    var text = xhr.responseText;
    //convert to JSON, get the value of content and decode from base64
    //then convert the decoded content string to json
    callback(JSON.parse(atob(JSON.parse(text).content)));
  };

  xhr.onerror = function() {
    throw exception;
  };

  xhr.send();
};

function loadDataFromRepos(data) {

  var json = {"nodes": [], "links": []};

  function downloadCallback(responseText) {
    processNodes(responseText, json);
  };

  data.repos.forEach( function(repo_name, i) {

    downloadFile(repo_name, downloadCallback);

    processLinks(json);

  });

  //TODO: Check if it is a python app

  //TODO: Get requirements.txt for dependencies

  //TODO: Add python dependencies to json

  //TODO: Check if it is a java app

  //TODO: Get dependencies from POM?

  //TODO: How do we get apps/dependencies called via HTTP?

  return json;

};

function drawArchitecture(options, json) {

  var force = d3.layout.force()
  .charge(-10000)
  .linkDistance(150)
  .gravity(1)
  .linkStrength(5)
  .size([options.width, options.height]);

  var svg = d3.select("#"+options.id).append("svg")
  .attr("width", options.width)
  .attr("height", options.height);

  //create tooltip div to be used later
  var tooltip = d3.select("body").append("div")
  .attr("class", "tooltip")
  .style("position","absolute")
  .style("opacity", 0)
  .style("text-align","center")
  .style("width","300px")
  .style("height","140px")
  .style("border-radius","8px")
  .style("border","0px")
  .style("padding","2px")
  .style("font-size","12px")
  .style("font-family","sans-serif")
  .style("pointer-events","none")
  .style("background","lightsteelblue");

  force
  .nodes(json.nodes)
  .links(json.links);

  //Build the directional arrows for the links/edges
  svg.append("svg:defs")
  .selectAll("marker")
  .data(["mid"])
  .enter().append("svg:marker")
  .attr("id", "linkMarker")
  .attr("viewBox", "0 -5 10 10")
  .attr("markerWidth", 3)
  .attr("markerHeight", 3)
  .attr("fill", "#aaa")
  .attr("orient", "auto")
  .append("svg:path")
  .attr("d", "M0,-5L10,0L0,5");

  var link = svg.selectAll(".link")
  .data(json.links)
  .enter().append("path")
  .attr("marker-mid", "url(#linkMarker)")
  .attr("class", "link")
  .style("stroke", "#ccc")
  .style("stroke-width", 3);

  var nodes = svg.selectAll(".node")
  .data(json.nodes)
  .enter().append("g")
  .attr("class", "node")
  .on("mouseover", function(d) {
    tooltip.transition()
    .duration(200)
    .style("opacity", .9);
    tooltip
    .style("left", (d3.event.pageX + 5) + "px")
    .style("top", (d3.event.pageY - 28) + "px")
    .html(function(){
      var type = "<p>Type: " + d.type + "</p>";
      var sourceCode = ((d.code_url == "" || d.code_url == null) ? "" : "<p>Source code: " + d.code_url + " (double click to go to code repository)</p>");
      var tech = ((d.tech == "") ? "" : "<p>Technology: " + d.tech + " </p>");
      var dep = ((d.dep == "") ? "" : "<p>Dependencies: " + d.dep + " </p>");
      return type + sourceCode + tech + dep;
    })
  })
  .on("mouseout", function(d) {
    tooltip.transition()
    .duration(500)
    .style("opacity", 0);
  })
  .call(force.drag);

  cylinder = svg.selectAll("defs").append("g")
  .attr("class", "cylinder")
  .attr("id","cylinder");

  cylinder.append("ellipse")
  .attr("rx","8")
  .attr("ry","4")
  .attr("cx","12")
  .attr("cy","17")
  .attr("stroke","#FFFFFF");

  cylinder.append("rect")
  .attr("width", "16")
  .attr("height", "12")
  .attr("x", "4")
  .attr("y", "5")
  .attr("fill", "#000000")
  .attr("stroke", "none")

  cylinder.append("ellipse")
  .attr("rx","8")
  .attr("ry","4")
  .attr("cx","12")
  .attr("cy","5")
  .attr("stroke","#FFFFFF");

  cylinder.append("line")
  .attr("x1","4.0")
  .attr("x2","4.0")
  .attr("y1","5.0")
  .attr("y2","17.0")
  .attr("stroke","#FFFFFF");

  cylinder.append("line")
  .attr("x1","20.0")
  .attr("x2","20.0")
  .attr("y1","5.0")
  .attr("y2","17.0")
  .attr("stroke","#FFFFFF");

  smiley = svg.selectAll("defs").append("g")
  .attr("class","smiley")
  .attr("id","smiley");

  smiley.append("circle")
  .attr("cx","12")
  .attr("cy","12")
  .attr("r","8")
  .attr("stroke","white")
  .attr("fill","black");

  smiley.append("circle")
  .attr("cx","9")
  .attr("cy","8")
  .attr("r","1")
  .attr("stroke","white")
  .attr("fill", "white");

  smiley.append("circle")
  .attr("cx","15")
  .attr("cy","8")
  .attr("r","1")
  .attr("stroke","white")
  .attr("fill", "white");

  smiley.append("ellipse")
  .attr("cx","12")
  .attr("cy","15")
  .attr("rx","5")
  .attr("ry", "2")
  .attr("stroke","white")
  .attr("fill","black");

  smiley.append("ellipse")
  .attr("cx","12")
  .attr("cy","13")
  .attr("rx","5")
  .attr("ry", "2")
  .attr("stroke","black")
  .attr("fill","black");

  lg = svg.select("defs").selectAll("linearGradient").data(["backend","frontend"])
  .enter()
  .append("linearGradient")
  .attr("id",String)
  .attr("gradientUnits","objectBoundingBox")
  .attr("x1","1")
  .attr("x2","1")
  .attr("y1","0")
  .attr("y2","1");

  lg.append("stop")
  .attr("stop-color", function(d){ if (d=="frontend") {return "#990000"} else {return "#014373"};})
  .attr("class","light-color")
  .attr("offset","0");

  lg.append("stop")
  .attr("stop-color",function(d){ if (d=="frontend") {return "#770000"} else {return "#012473"};})
  .attr("class","medium-color")
  .attr("offset","0.67");

  filter = svg.selectAll("defs")
  .append("filter")
  .attr("id","virtual_light")
  .attr("filterUnits","objectBoundingBox")
  .attr("x","-0.1")
  .attr("y","-0.1")
  .attr("width","1.2")
  .attr("height","1.2");

  filter.append("feGaussianBlur")
  .attr("in","SourceAlpha")
  .attr("stdDeviation","0.5")
  .attr("result","alpha_blur");

  filter.append("feOffset")
  .attr("in", "alpha_blur")
  .attr("dx","4")
  .attr("dy","4")
  .attr("result","offset_alpha_blur");

  filter.append("feSpecularLighting")
  .attr("in","alpha_blur")
  .attr("surfaceScale","5")
  .attr("specularConstant","1")
  .attr("specularExponent","20")
  .attr("lighting-color","#FFFFFF")
  .attr("result","spec_light")
  .append("fePointLight")
  .attr("x","-5000")
  .attr("y","-10000")
  .attr("z","10000");

  filter.append("feComposite")
  .attr("in","spec_light")
  .attr("in2","SourceAlpha")
  .attr("operator","in")
  .attr("result","spec_light");

  filter.append("feComposite")
  .attr("in","SourceGraphic")
  .attr("in2","spec_light")
  .attr("operator","out")
  .attr("result","spec_light_fill");

  merge = filter.append("feMerge");

  merge.append("feMergeNode").attr("in","offset_alpha_blur");
  merge.append("feMergeNode").attr("in","spec_light_fill");

  rect = nodes.append("rect")
  .attr("width", "50")
  .attr("height", "50")
  .attr("rx", "5")
  .attr("ry", "5")
  .attr("fill", function(d) {

    switch(d.type) {
      case "back-end":
        return "url(#backend)";
        break;
      case "front-end":
        return "url(#frontend)";
        break;
      case "queue":
        return "white";
        break;
      case "database":
        return "white";
        break;
      };  })
  .attr("stroke", function(d) { if (d.type=="queue" || d.type=="database") { return "white"}
                                else { return ((d.type=="back-end") ? "#000173" : "#360000")}})
  .attr("filter",function(d) { return (((d.type=="queue" || d.type=="database")) ? "none" : "url(#virtual_light)")});

  nodes.append("text")
  .text(function(d) { return d.name; })
  .attr("x", 57)
  .attr("y", 27)
  .style("font", "12px sans-serif");

  nodes
  .each(function(d) {
    var node = d3.select(this);

    if (d.database=="true") {

      node.append("use")
      .attr("xlink:href","#cylinder")
      .attr("x", "27")
      .attr("y", "27");

    };

    if (d.type == "queue") {

      node.append("path")
      .attr("d","M2,10 L10,10 L10,40 L40,40 L40,10 L48,10")
      .attr("stroke","black")
      .attr("stroke-width","3")
      .attr("fill","none");

    };

    if (d.type == "database") {

      bigDatabase = node.append("g")
      .attr("fill","#cc00ff")
      .attr("style","stroke-width:3;fill-opacity:1");

      bigDatabase.append("ellipse")
      .attr("rx","25")
      .attr("ry","10")
      .attr("cx","25")
      .attr("cy","40")
      .attr("fill","#cccccc")
      .attr("stroke","#000000");

      bigDatabase.append("rect")
      .attr("width","50")
      .attr("height","30")
      .attr("x","0")
      .attr("y","10")
      .attr("fill","#cccccc")
      .attr("stroke","none");

      bigDatabase.append("ellipse")
      .attr("rx","25")
      .attr("ry","10")
      .attr("cx","25")
      .attr("cy","10")
      .attr("fill","#cccccc")
      .attr("stroke","#000000");

      bigDatabase.append("line")
      .attr("x1","0")
      .attr("y1","10")
      .attr("x2","0")
      .attr("y2","40")
      .attr("fill","#cccccc")
      .attr("stroke","#000000");

      bigDatabase.append("line")
      .attr("x1","50")
      .attr("y1","10")
      .attr("x2","50")
      .attr("y2","40")
      .attr("fill","#cccccc")
      .attr("stroke","#000000");

    };

  });

  //on click event for a node
  function onNodeDoubleClick(d) {

    if (!(d.code_url=="") && !(d.code_url==null)) {
      window.location = d.code_url;
    };

  };

  nodes
  .on("dblclick", onNodeDoubleClick);

  //fix position of node if a user moves it
  function dragstart(d) {
    d3.select(this).classed("fixed", d.fixed = true);
  }

  var drag = force.drag()
  .on("dragstart", dragstart);

  force.on("tick", function() {

    // Make the links link to the centre of each node,
    //also, add a third point in the middle of the line in order
    //add a marker to it
    link.attr("d", function(d) {
      return "M" +
      (d.source.x + 25) + "," +
      (d.source.y + 25) + "L" +
      (d.source.x + 25  + d.target.x + 25)/2 + "," + (d.source.y + 25 + d.target.y + 25)/2 +
      "L" +
      (d.target.x + 25) + "," +
      (d.target.y + 25);  });

    // Translate the nodes
    nodes.attr("transform", function(d) {
      return "translate(" + [d.x, d.y] + ")";
    });
  });

  force.start();
  //force only 50 ticks
  for (var i = 50; i > 0; --i) force.tick();
  force.stop();

  if (options.addLegend == true) {

    addLegend(options);

  };

};

function addLegend(options) {

  legend = d3.select("svg").append("g")
  .attr("class","legend")
  .attr("width","155")
  .attr("height","200");

  legend.append("text")
  .attr("x", 50)
  .attr("y", 20)
  .text("Legend")
  .style("font", "14px sans-serif");

  legend.append("rect")
  .attr("width","155")
  .attr("height","250")
  .attr("stroke", "black")
  .attr("fill","none");

  legend.append("rect")
  .attr("width", "50")
  .attr("height", "50")
  .attr("rx", "5")
  .attr("ry", "5")
  .attr("x", 5)
  .attr("y", 30)
  .attr("fill", "url(#frontend)")
  .attr("stroke", "#360000")
  .attr("filter","url(#virtual_light)");

  legend.append("text")
  .text("frontend service")
  .attr("x", 62)
  .attr("y", 60)
  .style("font", "12px sans-serif");

  legend.append("rect")
  .attr("width", "50")
  .attr("height", "50")
  .attr("rx", "5")
  .attr("ry", "5")
  .attr("x", 5)
  .attr("y", 90)
  .attr("fill", "url(#backend)")
  .attr("stroke", "#000173")
  .attr("filter","url(#virtual_light)");

  legend.append("text")
  .text("backend service")
  .attr("x", 62)
  .attr("y", 120)
  .style("font", "12px sans-serif");

  legend.append("use")
  .attr("xlink:href","#cylinder")
  .attr("x", 20)
  .attr("y", 160);

  legend.append("text")
  .text("has a database")
  .attr("x", 62)
  .attr("y", 175)
  .style("font", "12px sans-serif");

  legend.append("rect")
  .attr("width", "50")
  .attr("height", "50")
  .attr("rx", "5")
  .attr("ry", "5")
  .attr("x", 5)
  .attr("y", 190)
  .attr("fill", "white")
  .attr("stroke", "white");

  legend.append("path")
  .attr("d","M9,200 L17,200 L17,230 L47,230 L47,200 L55,200")
  .attr("stroke","black")
  .attr("stroke-width","3")
  .attr("fill","none");

  legend.append("text")
  .text("queue")
  .attr("x", 62)
  .attr("y", 217)
  .style("font", "12px sans-serif");

  legend.attr("transform", function(d) {
    return "translate(" + [options.width-156, 2] + ")";
  });

};

function archDraw(options) {

  var dataFileName;

  var pathToData = ((options.pathToData == null) ? "" : options.pathToData);

  var defaultDataName = ((options.drawFromCode == true) ? "repos.json" : "services.json");

  var dataFileName = ((options.dataFileName == null) ? defaultDataName : options.dataFileName);

  d3.json(pathToData + dataFileName, function(error, fileData) {
    if (error) return console.warn(error);

    var data = ((options.drawFromCode == true) ? loadDataFromRepos(fileData) : loadDataFromFile(fileData));

    drawArchitecture(options, data)
  });

};
