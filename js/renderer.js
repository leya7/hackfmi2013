Renderer = function(canvas) {
	var canvas = $(canvas).get(0),
        ctx = canvas.getContext("2d"),
        gfx = arbor.Graphics(canvas),
	    particleSystem = null,
	    defaultFontSize = 18,
	    fontFamily = "Comfortaa",
	    defaultNodeColor = '#fcf405',
		selectedNodeColor = '#ff9fb5',
		
		defaultEdgeColor = '#4195c9',
		selectedInEdgeColor = '#cf1717',
		selectedOutEdgeColor = '#bff05b',
		
		radius = 30;
	
	
	
	//Hack: imports the fancy font for the nodes
	WebFontConfig = {
		google: { families: [ 'Comfortaa:400,700,300:cyrillic-ext,latin' ] }
	};
	(function() {
		var wf = document.createElement('script');
		wf.src = ('https:' == document.location.protocol ? 'https' : 'http') +
		  '://ajax.googleapis.com/ajax/libs/webfont/1/webfont.js';
		wf.type = 'text/javascript';
		wf.async = 'true';
		var s = document.getElementsByTagName('script')[0];
		s.parentNode.insertBefore(wf, s);
	})();
	
	
	
	var that = {
		init : function(system) {
			ctx.canvas.width  = window.innerWidth*0.8;
			ctx.canvas.height = window.innerHeight*1.2;
			
			particleSystem = system;
			particleSystem.screenSize(ctx.canvas.width, ctx.canvas.height);
			particleSystem.screenPadding(100);
			
			var resizeCanvas =  function(){
				ctx.canvas.width  = window.innerWidth*0.7;
				ctx.canvas.height = window.innerHeight*0.9;
				particleSystem.screenSize(canvas.width, canvas.height);
			};
			
			window.onresize = function(){
				resizeCanvas();
			};
			
			resizeCanvas();
			
			that.initMouseHandling();
	
			ctx.font = defaultFontSize + "px " + fontFamily;
			
			this.initMouseHandling()
		},
		redraw : function() {
			var nodeBoxes = {},
				nodeCircle = {};
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			
			//draw the fancy background
			var img = new Image();   // Create new img element
			img.src = "http://subtlepatterns.com/patterns/lined_paper.png";
			var height = ctx.canvas.height,
				width = ctx.canvas.width;
			for(var i = 0; i<width;i+=img.width){
				for(var j = 0; j<height;j+=img.height){
					ctx.drawImage(img,i,j);
				}
			}
			
			//node is the object from data and pt is the position of the element in the frame
			particleSystem.eachNode(function(node, pt) {
				var label = node.data.label || "Няма такъв предмет",
					width = radius*2+10,
					height = width;
					fontSize = defaultFontSize,
					color = (node.selected) ? selectedNodeColor : defaultNodeColor;
				
				nodeBoxes[node.name] = [pt.x-width/2, pt.y-height/2, width, height]
				nodeCircle[node.name] = {
					centerX:pt.x,
					centerY:pt.y,
					radius:width/2
				};
				
				//draw the node
				//gfx.oval(pt.x-width/2, pt.y-height/2+3, width, height, {fill:'#333'});
				gfx.oval(pt.x-width/2, pt.y-height/2, width, height, {fill:color});
				
				//draw the label
				ctx.textAlign = "center";
				ctx.font = fontSize + "px " + fontFamily;
				ctx.fillStyle = "black";
				ctx.fillText(label, pt.x, pt.y+(fontSize/3),width);
			})
			
			//edge is a line and pt1 and pt2 are the position of two points that describe the line
			particleSystem.eachEdge(function(edge, pt1, pt2) {
				// find the start point
				var head = intersect_line_circle(pt1, pt2, nodeCircle[edge.target.name]);
				var tail = intersect_line_circle(pt2, pt1, nodeCircle[edge.source.name]);
				
				var weight = edge.lineWidth || 4,
					color = (edge.color != selectedInEdgeColor && edge.color != selectedOutEdgeColor) ? defaultEdgeColor : edge.color;
				
				var grd = ctx.createLinearGradient(tail.x, tail.y, head.x, head.y);
				grd.addColorStop(0, '#fff'); 
				grd.addColorStop(0.2, color);
				grd.addColorStop(1, color);
				
				
				ctx.save() 
					ctx.beginPath()
					ctx.lineWidth = weight
					ctx.strokeStyle = grd;

					ctx.moveTo(tail.x, tail.y)
					ctx.lineTo(head.x, head.y)
					ctx.stroke()
				ctx.restore()

				// draw an arrowhead 
				ctx.save()
					// move to the head position of the edge we just drew
					var arrowLength =  weight * 2
					var arrowWidth =  weight * 1.5
					ctx.fillStyle = color
					ctx.translate(head.x, head.y);
					ctx.rotate(Math.atan2(head.y - tail.y, head.x - tail.x));

					
				// delete some of the edge that's already there (so the point isn't hidden)
				gfx.rect(-arrowLength/2,-weight/2, arrowLength/2,weight, 0, {fill:"#D4E7ED"})
				
				// draw the chevron
				ctx.beginPath();
					ctx.moveTo(-arrowLength, arrowWidth);
					ctx.lineTo(0, 0);
					ctx.lineTo(-arrowLength, -arrowWidth);
					ctx.lineTo(-arrowLength * 0.8, -0);
					ctx.closePath();
					ctx.fill();
				ctx.restore()
			})
			
		},
		initMouseHandling : function() {
			// no-nonsense drag and drop (thanks springy.js)
			selected = null;
			nearest = null;
			var dragged = null;
			var oldmass = 1;
			
			
			$(canvas).mousedown(function(e) {
				var pos = $(this).offset();
				var mouseP = {
					
					x : e.pageX - pos.left,
					y : e.pageY - pos.top,
				
				};
				var nearestP = particleSystem.nearest(mouseP);
				
				if(nearestP.distance < radius){
					selected = nearest = dragged = nearestP;
				}
				that.printInfo(selected);

				if (selected) {
					dragged.node.fixed = true;
				}
				return false;
			});

			$(canvas).mousemove(function(e) {
				var old_nearest = nearest && nearest.node._id
				var pos = $(this).offset();
				var mouseP = {
					x : e.pageX - pos.left,
					y : e.pageY - pos.top
				};
				
				nearest = particleSystem.nearest(mouseP);
				
				if (!nearest)
					return;
				
				if (dragged) {
					var p = particleSystem.fromScreen(mouseP)
					dragged.node.p = {
						x : p.x,
						y : p.y
					};
				}

				return false;
			});

			$(window).bind('mouseup', function(e) {
				try{
					if (dragged === null || dragged.node === undefined)
						return dragged.node.fixed = false;
					dragged.node.tempMass = 100;
					dragged = null;
					selected = null;
					return false;
				}catch(e){}	
			});

		},
		
		printInfo : function(selectedSubject) {
			if(selectedSubject) {
				g_selectedSubject = g_subjects[selectedSubject.node.name];
				$('#SelectedSubject').fadeIn();
				$('#SubjectName').text(g_selectedSubject.Name);
				$('#SubjectDescr').text(g_selectedSubject.Description);
				$('#SubjectProvides').text(g_selectedSubject.Provides.toString().replace(/\,/g, ', '));
				$('#SubjectDepends').text((g_selectedSubject.Depends == null) ? "знания от училище" : g_selectedSubject.Depends.toString().replace(/\,/g, ', '));

				particleSystem.eachEdge(function(edge, pt1, pt2) {
					edge.color = defaultEdgeColor;
					edge.lineWidth = 4;
					edge.target.selected = false;
					edge.source.selected = false;
				});
				selectedSubject.node.selected = true;
				
				var visitOut = function(node, level) {
				    particleSystem.eachEdge(function(cur, pt1, pt2) {
				        if(node.name == cur.source.name) {    // node -> cur
							cur.color = selectedOutEdgeColor;
							cur.lineWidth = 4 + (2 - level)*3;
				            visitOut(cur.target, level + 1);
				        }
				    });
				};
				var visitIn = function(node, level) {
				    particleSystem.eachEdge(function(cur, pt1, pt2) {
				        if(node.name == cur.target.name) {    // node <- cur
							cur.color = selectedInEdgeColor;
							cur.lineWidth = 4 + (2 - level)*3;
				            visitIn(cur.source, level + 1);
				        }
				    });
				};
				g_selectedSubject.name = g_selectedSubject.Name;
				visitOut(g_selectedSubject, 0);
				visitIn(g_selectedSubject, 0);
			} else {
				$('#SelectedSubject').fadeOut();
			}
		}
	}
	
	//helpers for drawing the edges 	
	var intersect_line_circle = function(p1, p2, circle){
		var v1 = { x: 1, y: 0 },
			v2 = { x: p2.x-p1.x, y:p2.y-p1.y },
			radius = circle.radius+5;
		
		var cos = (v1.x*v2.x + v1.y*v2.y) / (Math.sqrt(v2.x*v2.x + v2.y*v2.y));
		var sin = Math.sqrt(1 - cos*cos);
		
		var point = {};
		if(p2.y > p1.y){
			// point = p2;
			point = { x: p2.x - cos*radius, y: p2.y - sin*radius};
		} else {
			// point = p2;
			point = { x: p2.x - cos*radius, y: p2.y + sin*radius};
		}
		
		return point;
	}
	
	return that;
}

