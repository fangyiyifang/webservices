/**
 * draws.js: visualises graphs using JSON data
 */

/* scale functions for assigning node's sizes (width, height and font size) and distances between nodes */
var i_node_size_scales = d3.scaleLinear().domain([1, 250]).range([34, 17]);
var a_node_size_scales = d3.scaleLinear().domain([1, 250]).range([26, 13]);

var font_size_scales = d3.scaleLinear().domain([1, 250]).range([14, 10]);

var distance_scales = d3.scaleLinear().domain([1, 250]).range([50, 10]);
var charge_scales = d3.scaleLinear().domain([1, 250]).range([ - 200, -70]);
var displayNodes=[];
var displayBlackNodes=[];


function init_chart_data(area_id, min_svg_height) {
    var ret = {};

    ret.svg_width = $('#' + area_id).width();
    ret.svg_height = $('#' + area_id).height() < min_svg_height ? min_svg_height: $('#' + area_id).height();

    ret.svg = d3.select('svg').attr('width', ret.svg_width + 'px').attr('height', ret.svg_height + 'px');

    return ret;
}

function set_simulation(nodes_length, svg_width, svg_height) {

    var ret = {};

    ret.i_width = i_node_size_scales(nodes_length);
    ret.i_height = i_node_size_scales(nodes_length);

    ret.a_width = a_node_size_scales(nodes_length);
    ret.a_height = a_node_size_scales(nodes_length);

    ret.font_size = font_size_scales(nodes_length);

    var distance = distance_scales(nodes_length);
    var charge_strength = charge_scales(nodes_length);

    ret.simulation = d3.forceSimulation().force("link", d3.forceLink().id(function(d) {
        return d.nodeID;
    }).distance(distance)).force("charge", d3.forceManyBody().theta(0.5).strength(charge_strength))
            .force("center", d3.forceCenter(svg_width / 2, svg_height / 2)).on("end",
    function() {
        if (chart.nodes) {
            //          console.log(chart.nodes);//array,witth fx,fy, without x,y
            chart.nodes.forEach(function(d) {
                d.fx = d.x;
                d.fy = d.y;
            })
        }
    });

    return ret;
}

function set_zoom(svg) {

    // add encompassing group for the zoom
    var ret = svg.append("g").attr("class", "zoom");

    // add zoom capabilities
    var zoom_handler = d3.zoom().on("zoom",
    function() {
        ret.attr("transform", d3.event.transform);
    });

    zoom_handler(svg);

    svg.on("dblclick.zoom", null);

    return ret;
}

function draw(nodes, edges, chart) {

    var ret = {};
    ret.nodes = nodes;
    ret.edges = edges;

    //  console.log(ret.nodes);
    ret.node = chart.zoom.append("g").attr("class", "nodes").selectAll("g")
            .data(ret.nodes).enter().append("g").attr("id",
    function(d) {
        return "draw_" + d['nodeID'];
    }).attr("class", "node")
            .call(d3.drag().on("start", dragstarted).on("drag", dragged).on("end", dragended));

    ret.node.append("rect").attr("x", -8).attr("y", -8).attr("width",
    function(d) {
        if (d['type'] == "I") {
            return chart.node_style_data.i_width;
        } else {
            return chart.node_style_data.a_width;
        }
    }).attr("height",
    function(d) {
        if (d['type'] == "I") {
            return chart.node_style_data.i_height;
        } else {
            return chart.node_style_data.a_height;
        }
    }).attr("rx",
    function(d) {
        if (d['type'] == "I") {
            return chart.node_style_data.i_width / 8;
        } else if (d['type'] == "P") {
            return chart.node_style_data.a_width / 4;
        } else {
            return chart.node_style_data.a_width / 2;
        }
    }).attr("class",
    function(d) {
        var className = null;
        if (d['type'] == "I") {
            className = d['input'].toLowerCase() + '-node';
        } else if (d['type'] == "P") {
            className = 'pref-node';
        } else {
            className = (d['type'] == "CA") ? 'con-node': 'pro-node';
        }
        return className;
    }).append("title").text(function(d) {
        return d['text'];
    });
    

    ret.node.append("text")
            .attr("dx", 12).attr("dy", ".35em")
            .attr("font-size", chart.node_style_data.font_size).attr("class",
    function(d) {
        if (d['eval'] == "V") {
            return 'success';
        } else if (d['eval'] == "X") {
            return 'fail';
        } else if (d['eval'] == "?") {
            return 'question';
        }
    }).text(function(d) {
        return parseText(keyText(d['text']));
    });

    ret.node.each(function(data) {
        // debugger;
            var attr = app.workBoxView.createNodeModelFromData(data);       
    });

    ret.edge = chart.zoom.append("g").attr("class", "links").selectAll("line").data(ret.edges).enter().append("line").attr("id",
    function(d) {
        return 'draw_' + d['edgeID'];
    }).attr("marker-end", "url(#triangle)").attr("class",
    function(d) {
        var className = app.workBoxView.createEdgeModelFromData(d);
        //      console.log(className);
        // debugger;
        if (className.includes('pref-')) {
            this.setAttribute('marker-end', 'url(#pref-triangle)');
        } else if (className.includes('con-')) {
            this.setAttribute('marker-end', 'url(#con-triangle)');
        } else if (className.includes('pro-')) {
            this.setAttribute('marker-end', 'url(#pro-triangle)');
        } else if (className.includes('exist')) {

}
        return className;
    }).attr("style", "pointer-events: none");

    $("#pref-triangle").attr("refX", chart.node_style_data.a_width / 2);
    $("#con-triangle").attr("refX", chart.node_style_data.a_width / 2);
    $("#pro-triangle").attr("refX", chart.node_style_data.a_width / 2);
    
    nodeTransparency(displayNodes);
    addBlackCircle(displayBlackNodes);

    return ret;
}

function reDraw(nodes, edges) {
    for (var i = 0; i < nodes.length; i++) {
        if (chart.nodes.indexOf(nodes[i]) > -1) {}
        else {
            chart.nodes.push(nodes[i]);
        }
    }
    chart.node = chart.node.data(chart.nodes,
    function(d) {
        return d.nodeID;
    });
    chart.node.exit().remove();
    var  ret_node = chart.node.enter().append("g")
            .attr("id",function(d) {
        return "draw_" + d['nodeID'];
    }).attr("class", "node").call(d3.drag()
            .on("start", dragstarted).on("drag", dragged).on("end", dragended))
            .merge(chart.node);
    
    
    
    for (var j = 0; j < nodes.length; j++) {
        var new_node = d3.select('#draw_' + nodes[j]['nodeID']);
        new_node.call(d3.drag()
            .on("start", dragstarted).on("drag", dragged).on("end", dragended))
                .append("rect").attr("x", -8).attr("y", -8).attr("width",
        function(d) {
            if (d['type'] == "I") {
                return chart.node_style_data.i_width;
            } else {
                return chart.node_style_data.a_width;
            }
        }).attr("height",
        function(d) {
            if (d['type'] == "I") {
                return chart.node_style_data.i_height;
            } else {
                return chart.node_style_data.a_height;
            }
        }).attr("rx",
        function(d) {
            if (d['type'] == "I") {
                return chart.node_style_data.i_width / 8;
            } else if (d['type'] == "P") {
                return chart.node_style_data.a_width / 4;
            } else {
                return chart.node_style_data.a_width / 2;
            }
        }).attr("class",
        function(d) {
            if (d['type'] == "I") {
                return d['input'].toLowerCase() + '-node';
            } else if (d['type'] == "P") {
                return 'pref-node';
            } else {
                return (d['type'] == "CA") ? 'con-node': 'pro-node';
            }
        }).append("title").text(function(d) {
            return d['text'];
        });

        new_node.append("text").attr("dx", 12).attr("dy", ".35em").attr("font-size", chart.node_style_data.font_size).attr("class",
        function(d) {
            if (d['eval'] == "V") {
                return 'success';
            } else if (d['eval'] == "X") {
                return 'fail';
            } else if (d['eval'] == "?") {
                return 'question';
            }
        }).text(function(d) {
            return parseText(keyText(d['text']));
        });

        new_node.each(function(data) {
            // debugger;    
            var attr = app.workBoxView.createNodeModelFromData(data);

        });

    }

    for (var ei = 0; ei < edges.length; ei++) {
        if (chart.edges.indexOf(edges[ei]) > -1) {

} else {
            chart.edges.push(edges[ei]);
        }
    }
    // Apply the general update pattern to the edges.
    chart.edge = chart.edge.data(chart.edges,
    function(d) {
        return d.edgeID;
    });
    //  console.log(chart.edge);
    chart.edge.exit().remove();
    var ret_edge = chart.edge.enter().append('g').append('line').attr("id",
    function(d) {
        return 'draw_' + d['edgeID'];
    }).attr('class', 'lines')
    .merge(chart.edge);
    //    console.log(ret_edge);
    for (var ei = 0; ei < edges.length; ei++) {
        var new_edge = d3.select('#draw_' + edges[ei]['edgeID']);
        new_edge.attr('class',
        function(data) {
            var className = app.workBoxView.createEdgeModelFromData(data);
            if (className.includes('pref-')) {
                this.setAttribute('marker-end', 'url(#pref-triangle)');
            } else if (className.includes('con-')) {
                this.setAttribute('marker-end', 'url(#con-triangle)');
            } else if (className.includes('pro-')) {
                this.setAttribute('marker-end', 'url(#pro-triangle)');
            }
            return className;

        }).attr("style", "pointer-events: none");

        
    }
    $("#pref-triangle").attr("refX", chart.node_style_data.a_width / 2);
    $("#con-triangle").attr("refX", chart.node_style_data.a_width / 2);
    $("#pro-triangle").attr("refX", chart.node_style_data.a_width / 2);
    
    

    var ret = {};
    ret.node = ret_node;
    ret.edge = ret_edge;
    ret.nodes = chart.nodes;
    ret.edges = chart.edges;
    
    
    nodeTransparency(displayNodes);
    addBlackCircle(displayBlackNodes);
//    textShow(ret.nodes);
    return ret;

}

function nodePro(nodes, edges) {
    //data processing
    //get root node 
    //  get nodeID which type is 'con'
    var ret = {};
    ret.nodes = nodes;
    ret.edges = edges;
    
    

    var edgeSourceArr = [];
    var edgeTargetArr = [];
    var conArr = [];
    twoTargetRA=[];
    firstNodeShow = [];
    //  create node map(nodeID,object)
    nodeIDM = new Map();
    for (var k = 0; k < ret.nodes.length; k++) {
        nodeIDM.set(ret.nodes[k].nodeID, ret.nodes[k]);
    }
    
    var targetArr=[];
    for(var eSou=0;eSou<ret.edges.length;eSou++){
        targetArr.push(ret.edges[eSou].source);
    }

    //      add conArr node
    for (var i = 0; i < ret.nodes.length - 1; i++) {
        if (ret.nodes[i].type == 'CA') {
            //con node
            conArr.push(ret.nodes[i]);
            firstNodeShow.push(ret.nodes[i]);
            for (var j = 0; j < ret.edges.length - 1; j++) {
//                put target and source about 'CA'
                if (ret.edges[j].source == ret.nodes[i].nodeID) {
                    var objectTarget = nodeIDM.get(ret.edges[j].target);
                    if (conArr.indexOf(objectTarget) > -1) {

} else {
                        conArr.push(objectTarget); //get nodeID
                        firstNodeShow.push(objectTarget);
                    }
                } else if (ret.edges[j].target == ret.nodes[i].nodeID) {
                    var objectSource = nodeIDM.get(ret.edges[j].source);
                    if (conArr.indexOf(objectSource) > -1) {
                    } else {
                        conArr.push(objectSource);
                        firstNodeShow.push(objectSource);
                    }
                }
            }
        }
    }

    //      add edgeSourceArr and edgeTargetArr
    for (var e = 0; e < edges.length; e++) {
        for (var eDou = e + 1; eDou < edges.length; eDou++) {
            //                one node as two edges' source
            if (ret.edges[e].source == ret.edges[eDou].source) {
                //                          if the node is included into conArr
                if (conArr.indexOf(nodeIDM.get(ret.edges[e].source)) > -1) {

} else if (conArr.indexOf(nodeIDM.get(ret.edges[eDou].source)) > -1) {

} else {
                    edgeSourceArr.push(nodeIDM.get(ret.edges[e].source));
                    firstNodeShow.push(nodeIDM.get(ret.edges[e].source));
                    if(firstNodeShow.indexOf(nodeIDM.get(ret.edges[e].target))>-1){}
                    else{
                        firstNodeShow.push(nodeIDM.get(ret.edges[e].target));
                    }
                    if(firstNodeShow.indexOf(nodeIDM.get(ret.edges[eDou].target))>-1){}
                    else{
                        firstNodeShow.push(nodeIDM.get(ret.edges[eDou].target));
                    }
                    
                }
            }
            //            this node is not any edges' source(one node as two edges' target and not any edge's source)
            else if (ret.edges[e].target == ret.edges[eDou].target) {
//                when the type of this node is 'I'
                if (nodeIDM.get(ret.edges[e].target).type == 'I') {
                    if (conArr.indexOf(nodeIDM.get(ret.edges[e].target)) > -1) {

} else if (conArr.indexOf(nodeIDM.get(ret.edges[eDou].target)) > -1) {

} else {                    
                        if(targetArr.indexOf(ret.edges[e].target)>-1){
                            twoTargetRA.push(ret.edges[e].target);
                        }
                        else{
                            edgeTargetArr.push(nodeIDM.get(ret.edges[e].target));
                            firstNodeShow.push(nodeIDM.get(ret.edges[e].target));
                        }for(var et=0;et<ret.edges.length;et++){
                                     if (ret.edges[et].target == ret.edges[e].source) {
                                if (conArr.indexOf(nodeIDM.get(ret.edges[et].source)) > -1) {
                                    if(firstNodeShow.indexOf(nodeIDM.get(ret.edges[e].source))>-1){}
                                    else{
                                        firstNodeShow.push(nodeIDM.get(ret.edges[e].source));
                                    }   
                                }
                            } else if (ret.edges[et].target == ret.edges[eDou].source) {
                                if (conArr.indexOf(nodeIDM.get(ret.edges[et].source)) > -1) {
                                    if(firstNodeShow.indexOf(nodeIDM.get(ret.edges[eDou].source)>-1)){}
                                    else{
                                        firstNodeShow.push(nodeIDM.get(ret.edges[eDou].source));
                                    }
                                    
                                }
                            }
                                }                           
                        }  
                }
//                when the type of this node is 'RA'
                else if(nodeIDM.get(ret.edges[e].target).type == 'RA'){
                    if(firstNodeShow.indexOf(nodeIDM.get(ret.edges[e].target))>-1){}
                    else{
                        twoTargetRA.push(nodeIDM.get(ret.edges[e].target));
                    } 
                }
            }
        }
    }
    //    get edge's source in but edge's target not in firstNodeShow
    for (var conArrSource = 0; conArrSource < edges.length; conArrSource++) {
        if (conArr.indexOf(nodeIDM.get(ret.edges[conArrSource].source)) > -1) {
            if (firstNodeShow.indexOf(nodeIDM.get(ret.edges[conArrSource].target)) > -1) {

} else {
                firstNodeShow.push(nodeIDM.get(ret.edges[conArrSource].target));
            }
        }
    }
    
//    get only as edges' target and not any edge's source(root node)
    var notSourceNode=[];
    var sourceNode=[];
    for(var e=0;e<ret.edges.length;e++){
        sourceNode.push(ret.edges[e].source);
    }
    for(var ei=0;ei<ret.edges.length;ei++){
        if(sourceNode.indexOf(ret.edges[ei].target)>-1){}
        else{
            if(firstNodeShow.indexOf(nodeIDM.get(ret.edges[ei].target))>-1){
                
            }else{
                notSourceNode.push(nodeIDM.get(ret.edges[ei].target));
                firstNodeShow.push(nodeIDM.get(ret.edges[ei].target));
            }
            
        }
    }
   
    
    return firstNodeShow;
}

function edgePro(nodes, edges) {
//    console.log(nodes);
    var ret = {};
    ret.edges = edges;
    allEdges = edges;
    bEdges = edges;    
    var nodeIDMM = new Map();
    for (var k = 0; k < nodes.length; k++) {
        nodeIDMM.set(nodes[k].nodeID, nodes[k]);
    }
    conEdgeArr = [];
    for (var i = 0; i < ret.edges.length; i++) {
        if (nodes.indexOf(nodeIDMM.get(ret.edges[i].source)) > -1 && nodes.indexOf(nodeIDMM.get(ret.edges[i].target)) > -1) {
           
            conEdgeArr.push(ret.edges[i]);
        }
    }
    return conEdgeArr;
}



function edgeProOneNode(nodesSou, nodesTar, edges) {
    var ret = {};
    ret.edges = edges;
    var edgeSOT = [];
    edgeSOT[0] = new Array();
    edgeSOT[1] = new Array();
    for (var i = 0; i < ret.edges.length; i++) {
        if (ret.edges[i].source == nodesSou) {
            edgeSOT[0].push(ret.edges[i]);
        } else if (ret.edges[i].target == nodesTar) {
            edgeSOT[1].push(ret.edges[i]);
        } else {}
    }
    return edgeSOT;
}

//nodes and edge(hide middle process)
function getHideEdge(nodeShow, nodes, edges) {
    var ret = {};
    ret.nodes = nodes;
    ret.edges = edges;
    edgeHide = new Array();
    edgeHideEdge = new Array();
    var edgeHideSouOrTar = new Array();
    allHideEdge = new Array();
    edgeSTM = new Map();
    for (var edge = 0; edge < ret.edges.length; edge++) {
        edgeSTM.set(ret.edges[edge].source, ret.edges[edge].target);
    }
    edgeHideSTM = new Map();
    //    i is to get every node
    var z = 0;
    for (var i = 0; i < ret.nodes.length; i++) {
        if (nodeShow.indexOf(ret.nodes[i]) > -1) {
            //            if(ret.nodes[i].type=='I'){
            //               this is as target(pro others)
            var targetNode = edgeSTM.get(ret.nodes[i].nodeID); //ID
            if (typeof(targetNode) == 'undefined') {
            } else {
                if (nodeShow.indexOf(nodeIDM.get(targetNode)) > -1) {

} else {
                    edgeHide[z] = new Array();
                    edgeHideEdge[z] = new Array();
                    edgeHideSouOrTar[z] = new Array();
                    allHideEdge[z] = new Array();

                    edgeHide[z].push(nodeIDM.get(targetNode));
                    var targetNodeFor = edgeSTM.get(targetNode);
                    if (typeof(targetNodeFor) == 'undefined') {
//                        var hideEdgeSourceNode = ret.nodes[i].nodeID;
//                        var hideEdgeTargetNode = targetNode;
//                        edgeHideSTM.set(hideEdgeSourceNode, hideEdgeTargetNode);
                    } else {
                        while (nodeShow.indexOf(nodeIDM.get(targetNodeFor)) == -1) {
                            edgeHide[z].push(nodeIDM.get(targetNodeFor));
                            targetNodeFor = edgeSTM.get(targetNodeFor);
                            if (typeof(targetNodeFor) == 'undefined') {
                                break;
                            }
                        }
                        var hideEdgeSourceNode = ret.nodes[i].nodeID;
                        var hideEdgeTargetNode = targetNodeFor;
                        edgeHideSTM.set(hideEdgeSourceNode, hideEdgeTargetNode);
                    }
                    
                    edgeHideEdge[z] = edgePro(edgeHide[z], ret.edges);
                    edgeHideSouOrTar[z] = edgeProOneNode(hideEdgeSourceNode, hideEdgeTargetNode, ret.edges);
                    displayBlackNodes.push(nodeIDM.get(hideEdgeSourceNode));
                    

                    for (var z1 = 0; z1 < edgeHideSouOrTar[z][0].length; z1++) {
                        if (edgeHide[z].indexOf(nodeIDM.get(edgeHideSouOrTar[z][0][z1].target)) > -1) {
                            allHideEdge[z].push(edgeHideSouOrTar[z][0][z1]);
                        }
                    }
                    for (var z2 = 0; z2 < edgeHideSouOrTar[z][1].length; z2++) {
                        if (edgeHide[z].indexOf(nodeIDM.get(edgeHideSouOrTar[z][1][z2].source)) > -1) {
                            allHideEdge[z].push(edgeHideSouOrTar[z][1][z2]);
                        }
                    }
                    allHideEdge[z] = allHideEdge[z].concat(edgeHideEdge[z]);
                    z++;
                }
            }
        }
    }
//    console.log(edgeHideSTM);
    return edgeHideSTM;
}

//put some leaf nodes into show nodes
function getHideNode(nodeShow, nodes, edges) {
    var ret = {};
    ret.nodes = nodes;
    ret.edges = edges;
    leafEdgeArr = [];
    var leafNode = [];
    leafArr = [];
    var nodeTarget = [];
    targetNodeInShow = [];
    var leafNodeIDArr=[];
    for(var ln=0;ln<leafNode.length;ln++){
        leafNodeIDArr.push(leafNode[ln]);
    }
    //    get leaf node
    for (var e = 0; e < ret.edges.length; e++) {
        nodeTarget.push(ret.edges[e].target);
    }
    for (var e = 0; e < ret.edges.length; e++) {
        if (nodeTarget.includes(ret.edges[e].source)) {

} else {
            leafNode.push(nodeIDM.get(ret.edges[e].source));
        }
    }
    var y = 0;
//    nodes are two edges' target and one edge's source is leafNode
    for(var ra=0;ra<twoTargetRA.length;ra++){
        for(var eh=0;eh<edgeHide.length;eh++){
            if(edgeHide[eh].indexOf(twoTargetRA[ra])>-1){
                for(var era=0;era<ret.edges.length;era++){
                    if(nodeIDM.get(ret.edges[era].target)==twoTargetRA[ra]){
                        //if leaf node include this source
                        if(leafNode.indexOf(nodeIDM.get(ret.edges[era].source))>-1){
                            deleteArrEle(leafNode,nodeIDM.get(ret.edges[era].source));
                             //put deleted leaf node in to edgeHide[eh];
                            if(firstNodeShow.indexOf(nodeIDM.get(ret.edges[era].source))>-1){}
                            else{
                            var leafEdge=[];
                            leafEdge.push(nodeIDM.get(ret.edges[era].source));
                            leafEdge.push(twoTargetRA[ra]);
                            edgeHide[eh].push(nodeIDM.get(ret.edges[era].source));
                            edgeHideEdge[eh]=edgeHideEdge[eh].concat(edgePro(leafEdge,ret.edges));
                            for(var ehe=0;ehe<edgeHideEdge[eh].length;ehe++){
                                if(allHideEdge[eh].indexOf(edgeHideEdge[eh][ehe])>-1){}
                                else{
                                    allHideEdge[eh].push(edgeHideEdge[eh][ehe]);
                                }
                            }
                        }  
                        }
                    }
                }
            }
        }
    }
//    console.log(leafNode);
    for (var x = 0; x < ret.nodes.length; x++) {
        if (leafNode.indexOf(ret.nodes[x]) > -1) {
            if(nodeShow.indexOf(ret.nodes[x])>-1){}
            else{
            var targetNode = edgeSTM.get(ret.nodes[x].nodeID); //ID
            leafArr[y] = new Array();
            leafEdgeArr[y] = new Array();
            leafArr[y].push(ret.nodes[x]);
            if (nodeShow.indexOf(nodeIDM.get(targetNode)) > -1) {
                leafArr[y].push(nodeIDM.get(targetNode));
                displayNodes.push(nodeIDM.get(targetNode));
                targetNodeInShow.push(targetNode);
                //                        hide this lead node in this targetNode 
            } else {
                leafArr[y].push(nodeIDM.get(targetNode));
                var targetNodeFor = edgeSTM.get(targetNode);
                while (nodeShow.indexOf(nodeIDM.get(targetNodeFor)) == -1) {
                    leafArr[y].push(nodeIDM.get(targetNodeFor));
                    targetNodeFor = edgeSTM.get(targetNodeFor);
                }
                leafArr[y].push(nodeIDM.get(targetNodeFor));
                displayNodes.push(nodeIDM.get(targetNodeFor));
                targetNodeInShow.push(targetNodeFor);
            }
            console.log('^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^');
            console.log(leafArr[y]);
            leafEdgeArr[y] = edgePro(leafArr[y], ret.edges);
            y++;
        }
        }
    }
    
//    change the opacity for dispalyNodes
    return leafArr;
}

function nodeTransparency(target) {
    for(var t=0;t<target.length;t++){
      
        // changes style for designating the first point of linking
       $('#draw_'+target[t].nodeID+' rect').css('opacity','0.5');
      
  }
}

function addBlackCircle(target) {
    for(var t=0;t<target.length;t++){
    $("#draw_" + target[t].nodeID + " rect").addClass("node-blacklight");
}
}

function deleteArrEle(arr,element){
//    console.log(arr);
    for(var a=0;a<arr.length;a++){
        if(arr[a]==element){
            arr.splice(a,1);
        }
    }
//    console.log(arr);
    return arr;
}

function showHideNode(obj) {
                        
    var showNode = [];
    var nodes = [];
    var edges = [];
    var edgesForHide = [];
    var nodesForHide = [];
    var showEdge = [];
    console.log(targetNodeInShow);

    if (targetNodeInShow.indexOf(obj.currentTarget.id.substr(5)) > -1) {
        for (var x = 0; x < leafArr.length; x++) {
            //if the last node is the obj
            if (leafArr[x][leafArr[x].length - 1].nodeID == obj.currentTarget.id.substr(5)) {
                for (var j = 0; j < leafArr[x].length - 1; j++) {
                    if (showNode.indexOf(leafArr[x][j]) > -1) {} else {
                        nodes.push(leafArr[x][j]);
                        showNode.push(leafArr[x][j]);
                    }
                }
                for (var i = 0; i < leafEdgeArr[x].length; i++) {
                    if (showEdge.indexOf(leafEdgeArr[x][i]) > -1) {} else {
                        edges.push(leafEdgeArr[x][i]);
                        showEdge.push(leafEdgeArr[x][i]);
                    }
                }
            }
        }
        
         var ret_simulation = set_simulation(15, chart.svg.width, chart.svg.height);
        push_node_style_data(ret_simulation);

        // the simulation used when drawing a force-directed graph
        chart.simulation = ret_simulation.simulation;

         var ret_graph = reDraw(nodes, edges);
         
//         console.log(ret_graph);
        push_graph_data(ret_graph);

        // start simulation for displaying graphsv
        chart.simulation = restart_simulation(chart.simulation, false);

        $("#saveProgress").attr("disabled", true);

        $("#span-graphTitle").text("[" + chart.title + "]");
        
//        console.log(chart.nodes);
    } else {
        edgeHideSTM.forEach(function(value, key, edgeHideSTM) {
    
            if (obj.currentTarget.id.substr(5) == key) {
                for (var i = 0; i < edgeHide.length; i++) {
                    if (edgeSTM.get(key) == edgeHide[i][0].nodeID) {
                        nodesForHide = edgeHide[i];
                        edgesForHide = allHideEdge[i];
                    }
                }
                deleteFakeEdge(key, value);

                // the simulation used when drawing a force-directed graph

                
                 var ret_simulation = set_simulation(15, chart.svg.width, chart.svg.height);
        push_node_style_data(ret_simulation);

        // the simulation used when drawing a force-directed graph
        chart.simulation = ret_simulation.simulation;

        var ret_graph = reDraw(nodesForHide, edgesForHide);
        push_graph_data(ret_graph);

        // start simulation for displaying graphsv
        chart.simulation = restart_simulation(chart.simulation, false);
//        
//        restart_simulation_all();       
//        restart_simulation_all();      
//        restart_simulation_all();
//        console.log(chart.nodes);

        $("#saveProgress").attr("disabled", true);

        $("#span-graphTitle").text("[" + chart.title + "]");
            }
        });
    }

}

function hideNode(obj) {
    var showNode = [];
    var nodes = [];
    var fakeEdge = [];
    var fakeNodes = [];

    if (targetNodeInShow.indexOf(obj.currentTarget.id.substr(5)) > -1) {
        for (var x = 0; x < leafArr.length; x++) {
            if (leafArr[x][leafArr[x].length - 1].nodeID == obj.currentTarget.id.substr(5)) {
                for (var j = 0; j < leafArr[x].length - 1; j++) {
                    if (showNode.indexOf(leafArr[x][j]) > -1) {} 
                    else {
                        nodes.push(leafArr[x][j]);
                        showNode.push(leafArr[x][j]);
                    }
                }
            }
        }
        var nodesLength = nodes.length;

        for (var h = 0; h < nodesLength; h++) {
            deleteEdge(nodes[h].nodeID);
        }
        for(var cn=0;cn<chart.nodes.length;cn++){
            if(chart.nodes[cn].nodeID==nodes[0].nodeID){
                for (var h1 = 0; h1 < nodesLength; h1++) {
            
            deleteNode(cn);
        }
        break;
            }
        }
        
    } else {
        edgeHideSTM.forEach(function(value, key, edgeHideSTM) {
            if (obj.currentTarget.id.substr(5) == key) {
                for (var i = 0; i < edgeHide.length; i++) {
                    if (edgeSTM.get(key) == edgeHide[i][0].nodeID) {
                        for (var eh = 0; eh < edgeHide[i].length; eh++) {
                            nodes.push(edgeHide[i][eh]);
                        }
                    }
                }
                var nodesLength = nodes.length;
                var index = [];
                for (var l = 0; l < nodesLength; l++) {
                    index.push(nodes[l].index);
                }
                for (var h = 0; h < nodesLength; h++) {
                    deleteEdge(nodes[h].nodeID);
                }
                
                for(var cn=0;cn<chart.nodes.length;cn++){
            if(chart.nodes[cn].nodeID==nodes[0].nodeID){
                for (var h1 = 0; h1 < nodesLength; h1++) {
            
            deleteNode(cn);
        }
        break;
            }
        }
//                deleteFakeEdge(key,nodes[0].nodeID);

                var attr = {
                    edgeID: 'edge_'+obj.currentTarget.id.substr(5),
//                    edgeID:'',
                    formedgeid: "null",
                    graphID: chart.graphID,
                    islocked: "false",
                    source: key,
                    target: value
                };

                app.Edges.create(attr);
                fakeEdge.push(attr);
                fakeNodes.push(nodeIDM.get(key));
                fakeNodes.push(nodeIDM.get(value));
                // set up simulations for force-directed graphs
                var ret_simulation = set_simulation(15, chart.svg.width, chart.svg.height);
                push_node_style_data(ret_simulation);

                // the simulation used when drawing a force-directed graph
                chart.simulation = ret_simulation.simulation;
                var ret_graph = reDraw(fakeNodes, fakeEdge);
                app.toolBoxView.restartSimulation();
                push_graph_data(ret_graph);

                // start simulation for displaying graphsv
                chart.simulation = restart_simulation(chart.simulation, false);
                $("#saveProgress").attr("disabled", true);

                $("#span-graphTitle").text("[" + chart.title + "]");
            }
        });

    }
}


function dragstarted(d) {
    if (!d3.event.active) chart.simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
}

function dragged(d) {
    d.fx = d3.event.x;
    d.fy = d3.event.y;
}

function dragended(d) {
    if (!d3.event.active) chart.simulation.alphaTarget(0);
//     d.fx = null;
//     d.fy = null;
}

function ticked() {
//        console.log('3333333333333333333333333333333');
//        console.log(chart.edge);
    if (chart.edge) {
        chart.edge.attr("x1",
        function(d) {
            return d.source.x + chart.node_style_data.a_width / 4;
        }).attr("y1",
        function(d) {
            return d.source.y + chart.node_style_data.a_height / 4;
        }).attr("x2",
        function(d) {
            if (d.source.x < d.target.x) {
                return d.target.x;
            } else {
                return d.target.x + chart.node_style_data.a_width / 2;
            }
        }).attr("y2",
        function(d) {
            if (d.source.y < d.target.y) {
                return d.target.y;
            } else {
                return d.target.y + chart.node_style_data.a_height / 2;
            }
        });
    }

    if (chart.node) {
        chart.node.attr("x",
        function(d) {
            return d.x;
        }).attr("y",
        function(d) {
            return d.y;
        }).attr("transform",
        function(d) {
            return "translate(" + d.x + "," + d.y + ")";
        });
    }
}

function restart_simulation(simulation, restart) {

    if (!restart) {
        
        simulation.nodes(chart.nodes).on("tick", ticked);
        simulation.force("link").links(chart.edges);
    } else {
        simulation.force("link").links(chart.edges);

        simulation.restart();
    }

    return simulation;
}

function restart_simulation_all(simulation,restart) {

    if (!restart) {
        console.log('++++++++++++++++++++++++');
        console.log(chart.nodes);
        if (chart.nodes) {
        console.log('******************');
        console.log(chart.nodes);
      chart.nodes.forEach(function(d) {
        d.fx = null;
        d.fy = null;
      });
    }
    console.log(chart.nodes);
        
        simulation.nodes(chart.nodes).on("tick", ticked);
        simulation.force("link").links(chart.edges);
    } else {
        simulation.force("link").links(chart.edges);

        simulation.restart();
    }

    return simulation;

    
}


function addNewNode(attr, x, y) {
    console.log(attr);

    var transform = $(".zoom").attr("transform");

    var scale = 1;
    var translate_x = 0;
    var translate_y = 0;
    if (transform) {
        var arr = transform.split(" ");
        arr.forEach(function(d) {
            if (d.indexOf("translate") > -1) {
                var translate = d.substring(10, d.length - 1);
                translate_x = Number(translate.split(',')[0]);
                translate_y = Number(translate.split(',')[1]);
            }
            if (d.indexOf("scale") > -1) {
                scale = Number(d.substring(6).split(")")[0]);
            }
        });
    }

    var data = {
        "source": "user",
        "uncert": "Confirmed",
        "eval": "N/A",
        "text": attr['text'],
        "input": attr['input'],
        "dtg": attr['dtg'],
        "commit": "N/A",
        "type": attr['type'],
        "nodeID": attr['nodeID'],
        "annot": {
            "conc": {},
            "prem_assump": {}
        },
        "x": ((x - 60 - translate_x) / scale),
        "y": ((y - 190 - translate_y) / scale),
        "fx": ((x - 60 - translate_x) / scale),
        "fy": ((y - 190 - translate_y) / scale)
    }

    chart.nodes.push(data);

    // Apply the general update pattern to the nodes.
    chart.node = chart.node.data(chart.nodes,
    function(d) {
        return d.nodeID;
    });
    chart.node.exit().remove();

    var ret_node = chart.node.enter().append("g").attr("id", "draw_" + data['nodeID']).attr("class", "node").attr("x", data.x).attr("y", data.y).attr("transform", "translate(" + data.x + ", " + data.y + ")").call(d3.drag().on("start", dragstarted).on("drag", dragged).on("end", dragended)).merge(chart.node);

    var new_node = d3.select("#draw_" + data['nodeID']);

    new_node.append("rect").attr("x", -8).attr("y", -8).attr("width",
    function(d) {
        if (d['type'] == "I") {
            return chart.node_style_data.i_width;
        } else {
            return chart.node_style_data.a_width;
        }
    }).attr("height",
    function(d) {
        if (d['type'] == "I") {
            return chart.node_style_data.i_height;
        } else {
            return chart.node_style_data.a_height;
        }
    }).attr("rx",
    function(d) {
        if (d['type'] == "I") {
            return chart.node_style_data.i_width / 8;
        } else if (d['type'] == "P") {
            return chart.node_style_data.a_width / 4;
        } else {
            return chart.node_style_data.a_width / 2;
        }
    }).attr("class",
    function(d) {
        if (d['type'] == "I") {
            return d['input'].toLowerCase() + '-node';
        } else if (d['type'] == "P") {
            return 'pref-node';
        } else {
            return (d['type'] == "CA") ? 'con-node': 'pro-node';
        }
    }).append("title").text(function(d) {
        return d['text'];
    });

    new_node.append("text").attr("dx", 12).attr("dy", ".35em").attr("font-size", chart.node_style_data.font_size).text(parseText(keyText(data['text'])));

    return ret_node;
}

function deleteNode(index) {
   
    var ret = chart.nodes.splice(index, 1);

    // Apply the general update pattern to the nodes.
    chart.node = chart.node.data(chart.nodes,
    function(d) {
        return d.nodeID;
    });
    chart.node.exit().remove();

    return ret;
}


function addNewEdge(attr) {

    // debugger;
    var data = {
        "target": attr['target'],
        "source": attr['source'],
        "formEdgeID": null,
        "edgeID": attr['edgeID']
    }

    chart.edges.push(data);

    // Apply the general update pattern to the edges.
    chart.edge = chart.edge.data(chart.edges,
    function(d) {
        return d.edgeID;
    });
    chart.edge.exit().remove();

    var className = attr['className'];
    var markerClass = "url(#triangle)";

    if (className.includes('pref-')) {
        markerClass = "url(#pref-triangle)";
    } else if (className.includes('con-')) {
        markerClass = "url(#con-triangle)";
    } else if (className.includes('pro-')) {
        markerClass = "url(#pro-triangle)";
    }

    var ret_edge = chart.edge.enter().append("line").attr("marker-end", markerClass).attr("class", className).merge(chart.edge);

    return ret_edge;
}

function deleteEdge(id) {

    var deleted_edges = [];

    chart.edges = chart.edges.filter(function(e) {
        if (e['source']['nodeID'] == id || e['target']['nodeID'] == id) {
            deleted_edges.push(e);
        }
        return (e['source']['nodeID'] != id && e['target']['nodeID'] != id);
    });

    // Apply the general update pattern to the links.
    chart.edge = chart.edge.data(chart.edges,
    function(d) {
        return d.edgeID;
    });
    chart.edge.exit().remove();

    return deleted_edges;
}

function deleteFakeEdge(sourceID, targetID) {

    var deleted_edges = [];
//    console.log(chart.edges);

    chart.edges = chart.edges.filter(function(e) {
        if (e['source']['nodeID'] == sourceID && e['target']['nodeID'] == targetID) {
            deleted_edges.push(e);
        }
        return (e['source']['nodeID'] != sourceID || e['target']['nodeID'] != targetID);
    });

    // Apply the general update pattern to the links.
    chart.edge = chart.edge.data(chart.edges,
    function(d) {
        return d.edgeID;
    });
    console.log(chart.edge);
    chart.edge.exit().remove();

    return deleted_edges;
}