Renderer = function(canvas) {
    var canvas = $(canvas).get(0)

    var ctx = canvas.getContext("2d");
    var particleSystem = null

    ctx.font="20px Verdana";

    var that = {
      init : function(system) {

        particleSystem = system
        particleSystem.screenSize(canvas.width, canvas.height)
        particleSystem.screenPadding(100)

      },
      redraw : function() {
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        //edge is a line and pt1 and pt2 are the position of two points that describe the line
        particleSystem.eachEdge(function(edge, pt1, pt2) {
          // this is how we set in which color to draw
          ctx.strokeStyle = "rgba(0,0,0, .7)";

          ctx.lineWidth = 1 + 6 * edge.data.weight;
          ctx.beginPath();



          ctx.moveTo(pt1.x, pt1.y);
          ctx.lineTo(pt2.x, pt2.y);
          //ctx.arc(pt2.x, pt2.y, 6, 0, 180, true);

          //adds arrows, however they end up in weird positions
          //after the initial "shake"

          var angle = Math.atan2(pt2.y - pt1.y, pt2.x - pt1.x);
          var len = 16; //Math.sqrt((p2.y - p1.y) * (p2.y - p1.y) +
                          //    (p2.x - p1.x) * (p2.x - p1.x));

          ctx.moveTo(pt2.x, pt2.y);
          ctx.lineTo(pt2.x - len * Math.cos(angle - Math.PI / 6),
                     pt2.y - len * Math.sin(angle - Math.PI / 6));
          ctx.moveTo(pt2.x, pt2.y);
          ctx.lineTo(pt2.x - len * Math.cos(angle + Math.PI / 6),
                     pt2.y - len * Math.sin(angle + Math.PI / 6));
          console.log(angle);
          ctx.stroke();
        })

        //node is the object from data and pt is the position of the element in the frame
        particleSystem.eachNode(function(node, pt) {

          var w = 20;
          var offset = w / 2;


          ctx.fillStyle = 'rgb(0, 0, 0)';
          ctx.fillRect(pt.x - offset, pt.y - offset, offset, offset);

          //this is how we get the width of the text so we can calculate an offset
          var textOffset = ctx.measureText(node.data.label).width / 1.5
          ctx.fillText(node.data.label, pt.x - textOffset, pt.y - offset)

        })
      }
    }
    return that
  }


