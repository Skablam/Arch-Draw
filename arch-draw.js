function showTip(d,i) {

  // Hover over code
  $('<div class="ttip"></div>')
  .text(d.name)
  .append('<hr>')
  .append('<p>Source code:  ' + d.github + '</p>')
  .append('<p>Technology:  ' + d.tech + '</p>')
  .append('<p>Dependencies:  ' + d.dep + '</p>')
  .appendTo('body');

  $('.ttip').fadeIn('slow');
}

function removeTip() {

  // Hover out code
  $('.ttip').remove();

}

var coordinates = [0,0]; //mouse coordinates for node tooltip position

d3.select('html') // Selects the 'html' element
.on('mousemove', function()
{

  // Gets the mouse coordinates with respect to the top of the page
  //This is required for the position of the tooltip for the nodes
  coordinates = d3.mouse(this);
});

//mouse over event for a node
function mouseMove() {

  //position the tooltip near to the mouse position
  $('.ttip').css({ top: coordinates[1] + 10, left: coordinates[0] + 20 })

}

//on click event for a node
function onNodeClick(d) {

  window.location = d.github;

};

var json = {"nodes": [], "links": []};

var data; // a global

function DrawArchitecture() {

  //adding nodes to json
  for (var i = 0; i < data.production.length; i++) {

    service = data.production[i];

    var node = {};

    node["name"] = service.name;
    node["no"] = i;
    node["github"] = service.github;
    node["url"] = service.url;
    node["port"] = service.port;
    node["type"] = service.type;
    node["heroku"] = service.heroku;

    var tech = "";

    for (var j = 0; j < service.tech.length; j++) {

      if (j==0) {
        tech = service.tech[0];
      } else {
        tech = tech + " " + service.tech[j];
      };

    };

    node["tech"] = tech;

    var dependencies = "";

    for (var j = 0; j < service.dependencies.length; j++) {

      if (j==0) {
        dependencies = service.dependencies[0];
      } else {
        dependencies = dependencies + " " + service.dependencies[j];
      };

    };

    node["dep"] = dependencies;

    json.nodes.push(node);

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

  var width = 1200,
  height = 600

  var svg = d3.select("body").append("svg")
  .attr("width", width)
  .attr("height", height);

  var force = d3.layout.force()
  .gravity(1)
  .distance(100)
  .charge(-10000)
  .size([width, height]);


  //initialise position of frontend and system-of-record nodes
  for (i = 0; i < json.nodes.length; i++) {

    switch(json.nodes[i].name) {
      case "property-frontend":
        json.nodes[i].x = 900;
        json.nodes[i].y = 100;
        json.nodes[i].fixed = true;
        break;
        case "casework-frontend":
          json.nodes[i].x = 300;
          json.nodes[i].y = 100;
          json.nodes[i].fixed = true;
          break;
          case "service-frontend":
            json.nodes[i].x = 600;
            json.nodes[i].y = 100;
            json.nodes[i].fixed = true;
            break;
            case "system-of-record":
              json.nodes[i].x = 600;
              json.nodes[i].y = 500;
              json.nodes[i].fixed = true;
              break;
              default:
                json.nodes[i].y = 300;
    }

  }

  force
  .nodes(json.nodes)
  .links(json.links);

  //Build the directional arrows for the links/edges
  svg.append("svg:defs")
  .selectAll("marker")
  .data(["end"])
  .enter().append("svg:marker")
  .attr("id", String)
  .attr("viewBox", "0 -5 10 10")
  .attr("markerWidth", 3)
  .attr("markerHeight", 3)
  .attr("orient", "auto")
  .append("svg:path")
  .attr("d", "M0,-5L10,0L0,5");

  var link = svg.selectAll(".link")
  .data(json.links)
  .enter()
  .append("polyline")
  .style("stroke-width", 2)
  .attr("marker-mid", "url(#end)")
  .attr("class", "link");

  var node = svg.selectAll(".node")
  .data(json.nodes)
  .enter().append("g")
  .attr("class", "node")
  .call(force.drag);

  //add an image to the node
  node.append("image")
  .attr("xlink:href", function(d) { return "images/micro-service.png"} )
  .attr("x", -45)
  .attr("y", -25)
  .attr("width", 50)
  .attr("height", 50);

  //add the name of the node to the picture
  node.append("text")
  .attr("dx", 12)
  .attr("dy", ".35em")
  .text(function(d) { return d.name });

  node.on("mouseover", showTip)
  .on("mouseout", removeTip)
  .on("mousemove", mouseMove)
  .on("dblclick", onNodeClick)

  //fixed position of node if a user moves it
  function dragstart(d) {
    d3.select(this).classed("fixed", d.fixed = true);
  }

  var drag = force.drag()
  .on("dragstart", dragstart);

  force.on("tick", function() {

    link.attr("points", function(d) {
      return d.source.x + "," + d.source.y + " " +
      (d.source.x + d.target.x)/2 + "," + (d.source.y + d.target.y)/2 + " " +
      d.target.x + "," + d.target.y; });

      node.attr('y', function(d) {  return d.y; });
      node.attr('x', function(d) {  return d.x; });

      node.attr("transform", function(d) {
        return "translate(" + d.x + "," + d.y + ")";
      } //function
    ); //attr
  }); //force.on

  force.start();
  //force only 50 ticks
  for (var i = 50; i > 0; --i) force.tick();
  force.stop();

  console.log(json);

};

d3.json("services.json", function(error, services_json) {
  if (error) return console.warn(error);
  data = services_json;
  DrawArchitecture();
});
