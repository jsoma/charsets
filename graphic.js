(function () {
  var margin = {top: 0, right: 60, bottom: 0, left: 60};
    width = 1280 - margin.left - margin.right,
    height = 800 - margin.top - margin.bottom;

  var svg = d3.select("#graphic").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var PER_COL = 16
  var OFFSET = 20
  var BIG_FONT_SIZE = 64
  var SMALL_FONT_SIZE = parseInt(height / PER_COL) * 0.3
  var TINY_PADDING = 0
  var LEFT_SIDE = 0.3
  var RIGHT_SIDE = 1 - LEFT_SIDE
  var DECODER_SPACING = 100
  var LIGHT_HIGHLIGHT = '#FFFBCC'
  var DARK_HIGHLIGHT = 'darkred'
  var CHARSETS = Object.keys(mapping[160])
  CHARSETS.push(CHARSETS.shift())
  CHARSETS.push(CHARSETS.shift())
  // CHARSETS = ['ISO 8859-1', 'Windows-1252']
  var STEPPER_LENGTH = 1000
  var lineHeight = 1.1 // ems
  var SIDE_LENGTH = height * 0.75

  var xPositionScale = d3.scaleBand()
    .range([0, width])
    .padding(0.1)

  var yPositionScale = d3.scaleBand()
    .range([0, height])
    .padding(0.1)

  var letterXPositionScale = d3.scaleBand()
    .range([0, width])
    .padding(0.2)

  var squareScale = d3.scaleBand()
    .range([0, SIDE_LENGTH])
    .paddingInner(0.2)

  var chart = svg.append("g").attr("id", "chart").attr("transform", "translate(0,0)")
  var word = svg.append("g").attr("id", "word").attr("transform", "translate(0,0)")
  var decoder = svg.append("g").attr("id", "decoder").attr("transform", "translate(0,0)")  
  var longtext = svg.append("g").attr("id", "long-text").attr("transform", "translate(0,200)")
  var banner = svg.append("g").attr("id", "banner").attr("transform", "translate(10,110) rotate(-9)")
  var squares = svg.append("g").attr("id", "squares")
    .attr("transform", "translate(" + (width / 2 - SIDE_LENGTH / 2) + "," + (height / 2 - SIDE_LENGTH / 2) + ")")
  var intro = d3.select("#intro")

  banner.append("rect")
  banner.append("text")

  function getChar(code, charsetName) {
    if(code < 128) {
      return String.fromCharCode(code)
    }
    
    try {
      var result = mapping[code][charsetName]
      return result.length == 1 ? result : "\u00a0"
    } catch(err) {
      return "\u00a0"
    }
  }

  function getCode(character, charset) {
    var code = character.charCodeAt(0)
    if(code < 128) {
      return code
    }

    for(var key in mapping) {
      if(mapping[key][charset || 'ISO 8859-1'] == character) {
        return key
      }
    }
  }

  /* 

    write word

  */

  function writeWord(wordText) {
    var pieces = wordText.split("").map(function(d) {
      return { letter: d }
    })

    letterXPositionScale.domain(d3.range(pieces.length))

    rebuild("#word", pieces, function(d, i) {
      return i
    })

    word.selectAll(".codepoint")
      .attr("transform", function(d, i) {
        return "translate(" + letterXPositionScale(i) + "," + (height / 2) + ")"
      })

    word.selectAll("rect")
      .attr("width", letterXPositionScale.bandwidth())
      .attr("height", 200)
      .attr("y", -120)
      .attr("x", 0)

    word.selectAll(".symbol")
      .text(function(d) {
        return d.letter
      })
      .attr("dy", -OFFSET)
      .attr("dx", letterXPositionScale.bandwidth() / 2)

    var format = d3.format("d");
    word.selectAll(".number")
      .attr("dy", OFFSET)
      .attr("dx", letterXPositionScale.bandwidth() / 2)
      .transition()
      .duration(250)
      .delay(250)
      .on("start", function (d) {
        d3.active(this)
          .tween("text", function() {
            var that = d3.select(this),
                i = d3.interpolateNumber(that.text(), d.charCode)
            return function(t) { that.text(format(i(t))); };
          })
      });

  }

  function rebuild(base, _data, keyFunc) {
    var data = _data.map(function(d) {
        if(typeof d.charCode === 'undefined') {
          d.charCode = getCode(d.letter)
        } 
        if(typeof d.letter === 'undefined') {
          d.letter = String.fromCharCode(d.charCode)
        }
        return d
    })

    var elements = svg.select(base)
      .selectAll(".codepoint")
      .data(data, keyFunc)
    
    var added = elements.enter().append("g")

    added.append("rect")

    added.append("text")
      .attr("class", "symbol")

    added.append("text")
      .attr("class", "number")
      .attr("data-current", 0)

    added.merge(elements)
      .each(function(d) {
        d3.select(this).select("rect").datum(d)
        d3.select(this).select(".symbol").datum(d)
        d3.select(this).select(".number").datum(d)
      })
      .attr("class", function(d) {
        return "codepoint codepoint-" + d.charCode
      })
  }

  /*

  Chart
  
  */

  function buildChart() {
    var points = d3.range(256).map(function(d) {
      return { charCode: d }
    })

    rebuild("#chart", points, function(d) {
      return d.charCode
    })
    
    xPositionScale.domain(d3.range(parseInt(points.length / PER_COL))).padding(0)

    yPositionScale.domain(d3.range(PER_COL)).padding(0)

    svg.select("#chart")
      .selectAll(".codepoint")
      .classed("control", function(d) {
        return d.charCode <= 32 || d.charCode === 127
      })
      .classed("extended", function(d) {
        return d.charCode >= 128
      })
      .classed("digit", function(d) {
        return d.letter.match(/\d/)
      })
      .classed("letter", function(d) {
        return d.letter.match(/[A-Za-z]/)
      })
      .classed("punctuation", function(d) {
        return d.letter.match(/[\u0021-\u002F\u003A-\u0040\u005B-\u0060\u007B-\u007E]/)
      })
      .attr("transform", function(d) {
        var xPos = xPositionScale(parseInt(d.charCode / PER_COL))
        var yPos = yPositionScale(d.charCode % PER_COL)

        return "translate(" + xPos  + "," + yPos + ")"
      })

    chart.selectAll("rect")
      .attr("y", 0)
      .attr("x", 0)
      .attr("height", yPositionScale.bandwidth())
      .attr("width", xPositionScale.bandwidth())

    chart.selectAll(".symbol")
      .style("font-size", SMALL_FONT_SIZE + "pt")
      .attr("dy", yPositionScale.bandwidth() / 2)
      .attr("dx", xPositionScale.bandwidth() / 2 + 10)
      .attr("text-anchor", "end")
      .text(function(d) {
        return d.letter 
      })

    chart.selectAll(".number")
      .style("font-size", SMALL_FONT_SIZE * 0.75 + "pt")
      .attr("dy", yPositionScale.bandwidth() / 2)
      .attr("dx", xPositionScale.bandwidth() / 2 + 2)
      .attr("text-anchor", "start")
      .text(function(d) {
        return d.charCode
      })

    chart.append("g")
      .lower()
      .attr("class", "stripe-background")
      .selectAll("rect")
      .data(xPositionScale.domain())
      .enter().append("rect")
      .attr("class", function(d) {
        return "bg-bar"
      })
      .attr("x", function(d) {
        return xPositionScale(d)
      })
      .attr("y", 0)
      .attr("height", height)
      .attr("width", xPositionScale.bandwidth() + 1)

  }

  function moveWordToChart() {
    word.style("display", "block")
    chart.style("display", "block")

    var duration = 500

    word.selectAll(".codepoint")
      .transition()
      .duration(duration)
      .attr("transform", function(d) {
        var xPos = xPositionScale(parseInt(d.charCode / PER_COL))
        var yPos = yPositionScale(d.charCode % PER_COL)
        return "translate(" + xPos  + "," + yPos + ")"
      })
      .remove()

    var offset = chart.attr("transform").match(/(\d+),\s*\d+/) || ["0"],
      targetX = parseInt(offset[0]) + xPositionScale.bandwidth() / 2,
      targetY = yPositionScale.bandwidth() / 2

    word.selectAll(".symbol, .number")
      .transition()
      .duration(duration)
      .style("font-size", 5)
      .attr("dx", targetX)
      .attr("dy", targetY)

    word.selectAll("rect")
      .attr("opacity", 1)
      .transition()
      .duration(duration / 2)
      .attr("opacity", 0)
      .attr("height", 0)
      .attr("width", 0)
      .attr("x", targetX)
      .attr("y", targetY)
      .remove()
  }

  function runStep() {
    steps[currentStep].call()
  }

  d3.selectAll('body')
    .on('keydown', function() {
      if(d3.event.keyCode == 39 || d3.event.keyCode == 32) {
        currentStep++
        runStep()
      }
      if(d3.event.keyCode == 37) {
        currentStep--
        runStep()
      }
    })
    .on('click', function() {
      var x = d3.mouse(this)[0]
      if(x > 400) {
        currentStep++
        runStep()
      } else {
        currentStep--
        runStep()
      }
    })
    .on('touchstart', function() {
      var x = d3.mouse(this)[0]
      if(x > 400) {
        currentStep++
        runStep()
      } else {
        currentStep--
        runStep()
      }
    })

  function highlightText(element, color) {
    var container = d3.select(element.node().parentNode).append("g")

    container.append("rect").style("fill", "black")

    container.append("text")
      .text(element.text())
      .attr("x", element.attr("x"))
      .attr("y", element.attr("y"))
      .attr("font-size", element.attr("font-size"))
      .style("alignment-baseline", element.style("alignment-baseline"))
      .attr("text-anchor", element.attr("text-anchor"))
    
    container.classed("highlight", true)
    var bbox = element.node().getBBox()

    container.select("rect")
      .attr("x", bbox.x - 20)
      .attr("y", bbox.y - 10)
      .attr("height", bbox.height + 20)
      .attr("width", bbox.width + 40)

    element.remove()

    return container
  }

  function updateBanner(charset) {
    banner.select("text").text(charset)
    var bbox = banner.select("text").node().getBBox()

    banner.select("rect")
      .attr("x", bbox.x - 20)
      .attr("y", bbox.y - 10)
      .attr("height", bbox.height + 20)
      .transition()
      .duration(150)
      .attr("width", bbox.width + 40)

    banner.raise().style("display", "block")
  }

  var steps = []

  function addStep(fn) {
    steps.push(fn)
  }

  function highlight(wordText) {
    d3.select(".codepoint").classed("highlight", false)

    wordText.split("")
      .map(getCode)
      .forEach(function(code) {
        d3.select(".codepoint-" + code)
          .classed("highlight", true)
      })

  }

  function onChart(selected) {
    types = ['letter', 'digit', 'punctuation', 'control', 'extended']
    types.forEach(function(type) {
      isVisible = type in selected && selected[type]
      chart.selectAll("." + type).classed("invisible", !isVisible)
    })
    chart.classed("invisible", Object.keys(selected).length == 0)

    var hasExtended = 'extended' in selected && selected['extended']

    var offset = hasExtended ? 0 : xPositionScale.range()[1] / 4

    chart.transition()
      .attr("transform", "translate(" + offset + ",0)")

    chart.selectAll(".bg-bar")
      .classed("invisible", function(d) {
        return !hasExtended && d * PER_COL > 127
      })
  }

  function changeCharSet(charset) {
    d3.selectAll(".encoded-line")
      .each(function(d) {
        d.previous = d3.select(this).text()
      })
      .text(function(d) {
        return d.content
          .split("")
          .map(function(char) {
            return getCode(char, d.charset)
          })
          .map(function(code) {
            return getChar(code, charset)
          })
          .join("")
      })

    d3.selectAll(".codepoint .symbol")
      .text(function(d) {
        if(d.charCode in mapping) {
          return mapping[d.charCode][charset]
        } else {
          return d.letter
        }
      })

    updateBanner(charset)
  }

  function currentText(root) {
    return d3.select("#chart")
      .selectAll(".symbol").nodes()
      .map(function(d) { 
        return d.textContent
      })
  }

  function currentAsCharset(root, charset) {
    return d3.select("#chart")
      .selectAll(".symbol")
      .data()
      .map(function(d) { 
        return getChar(d.charCode, charset)
      })
  }

  buildChart()
  onChart({})

  var isoStepper
  var charsetIndex = -1
  function startStepping(charsets = CHARSETS) {
    function doStep() {
      charsetIndex++
      charsetIndex = charsetIndex % charsets.length

      var originals = currentAsCharset("#chart", "ISO 8859-1")
      changeCharSet(charsets[charsetIndex])
      highlightDifferences("#chart", originals)
    }
    banner.style("display", "block")
    isoStepper = setInterval(doStep, STEPPER_LENGTH)
    doStep()
  }

  function stopStepping() {
    clearInterval(isoStepper)
    banner.style("display", "none")
  }

  var decoderXPositionScale = d3.scaleBand()
    .range([0, RIGHT_SIDE * width])
    .padding(0.1)

  function highlightDifferences(root, originals) {
    root = d3.select(root)

    root.selectAll(".codepoint")
      .filter(function(d, i) {
        return originals[i].trim() != d3.select(this).select(".symbol").text().trim()
      })
      .select("rect")
      .transition()
      .duration(STEPPER_LENGTH * 0.25)
      .style("fill-opacity", 1)
      .style("fill", LIGHT_HIGHLIGHT)
      .transition()
      .duration(STEPPER_LENGTH * 0.5)
      .delay(STEPPER_LENGTH * 0.15)
      .style("fill-opacity", 0)

    longtext.selectAll(".encoded-line")
      .each(function(d, lineNumber) {
        var tspan = d3.select(this)
        var previous = d.previous
        var text = tspan.text()
        var chars = text.split("")
        var elementSize =tspan.node().getComputedTextLength() / chars.length

        elementSize = 25.25
        chars.forEach(function(char, i) {
          if(char != previous[i]) {
            longtext.append("rect")
              .attr("x", i * elementSize)
              .attr("y", (lineNumber + 1) * lineHeight - 0.9 + 'em')
              .attr("height", lineHeight + 'em')
              .attr("width", elementSize)
              .lower()
              // .transition()
              // .duration(STEPPER_LENGTH * 0.25)
              .style("fill-opacity", 1)
              .style("fill", 'darkred')
              .transition()
              .duration(0)
              .delay(STEPPER_LENGTH)
              // .style("fill-opacity", 0)
              .remove()

            // longtext.append("text")
            //   .text(char)
            //   .attr("x", i * elementSize)
            //   .attr("y", (lineNumber + 1) * lineHeight + 'em')
            //   .style("fill", "black")
            //   .transition()
            //   .duration(0)
            //   .delay(STEPPER_LENGTH)
            //   .remove()
          }
        })
      })

    // root.selectAll(".codepoint")
    //   .filter(function(d, i) {
    //     return originals[i] == d3.select(this).select(".symbol").text()
    //   })
    //   .select("rect")
    //   .transition()
    //   .duration(250)
    //   .style("fill-opacity", 0)
  }

  function wordDecoder(wordText, initialCharset, charsets = []) {
    var pieces = wordText.split("").map(function(d) {
      return { letter: d, charCode: getCode(d, initialCharset) }
    })

    decoderXPositionScale.domain(d3.range(pieces.length))
    
    DECODER_SPACING = (height - 100) / charsets.length

    decoder.append("g")
      .attr("class", "decoder-codes-header")
      .attr("transform", "translate(0, 60)")
      .selectAll("text")
      .data(pieces)
      .enter().append("text")
      .attr("class", "number")
      .text(function(d) {
        return d.charCode
      })
      .attr("x", function(d, i) {
        return LEFT_SIDE * width + decoderXPositionScale(i) + decoderXPositionScale.bandwidth() / 2
      })
      .attr("y", 0)

    decoder.append("g")
      .attr("class", "decoder-decodings")
      .selectAll(".charset-translation")
      .data(charsets)
      .enter().append("g")
      .attr("class", function(d) {
        return "charset-translation charset-" + d.replace(/ /g,'-')
      })
      .attr("transform", function(d, i) {
        return "translate(0," + i * DECODER_SPACING + ")"
      })
      .each(function(charset, i) {
        var trans = d3.select(this)

        trans.append("rect")
          .attr("x", LEFT_SIDE * width + decoderXPositionScale(0))
          .attr("y", DECODER_SPACING - 40)
          .attr("height", 60)
          .attr("width", width)

        trans.selectAll(".translation")
          .data(pieces)
          .enter().append("text")
          .attr("class", "translation")
          .attr("x", function(d, i) {
            return LEFT_SIDE * width + decoderXPositionScale(i) + decoderXPositionScale.bandwidth() / 2
          })
          .attr("y", DECODER_SPACING)
          .text(function(d) {
            return getChar(d.charCode, charset)
          })          

        trans.append("text")
          .attr("class", "charset-title")
          .attr("x", LEFT_SIDE * width - 20)
          .attr("y", DECODER_SPACING)
          .attr("text-anchor", "start")
          .text(charset)
      })
  }

  function longText(displayText, charset) {
    var text = longtext.append("text")
      .attr("x", 0)
      .attr("y", 0)
      .attr("dx", 0)
      .attr("dy", 0)
      .text(displayText)

    var words = text.text().split(/\s+/).reverse(),
        word,
        line = [],
        lineNumber = 0,
        y = text.attr("y"),
        dy = parseFloat(text.attr("dy")),
        tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em");

    while (word = words.pop()) {
      line.push(word);
      tspan.text(line.join(" "));
      if (tspan.node().getComputedTextLength() > width) {
        line.pop();
        tspan.text(line.join(" "));
        line = [word];
        tspan = text.append("tspan")
          .attr("class", "encoded-line")
          .datum({ 'charset': charset })
          .attr("x", 0)
          .attr("y", y)
          .attr("dy", ++lineNumber * lineHeight + dy + "em")
          .text(word);
      }
    }

    longtext.selectAll("tspan")
      .each(function(d, lineNumber) {
        var text = d3.select(this).text()
        d3.select(this).datum({
          'charset': charset,
          'content': text
        })
      })

  }


  function emojiNote(emoji, codepoint, x, y, rotation, base, size=72) {
    var holder = (base || squares).append("g")
      .attr("class", "emoji-holder")
      .attr("transform", "translate(" + x + "," + y + ") rotate(-5)")

    holder.append("text")
      .attr("x", 0)
      .attr("y", 0)
      .text(emoji)
      .attr("font-size", size)

    var code = holder.append("g")
      .attr("transform", "translate(0," + size * 0.5 + ") rotate(" + rotation + ")")
      .append("text")
      .text(codepoint)
      .attr("font-size", size * .25)

    var container = highlightText(code)
    return holder
    // container.select("rect").style("fill","pink")
    // container.select("text").style("fill", "black")
  }

  function showImages(list) {
    d3.select("#images").style("display", "block")
    d3.selectAll("#images img")
      .style("display", function(d) {
        return list.indexOf(this.id) == -1 ? 'none' : 'block'
      })
  }
  
  function display(show) {
    banner.style("display", "none")
    chart.style("display", "none")
    word.style("display", "none")
    longtext.style("display", "none")
    decoder.style("display", "none")
    squares.style("display", "none")

    if(show) {
      show.style("display", "block")
    }
  }

  addStep(function() {
    d3.select("#graphic").style("display", "none")
    d3.select("#intro").style("display", "block")
    showImages([])
  })
  
  addStep(function() {
    d3.select("#graphic").style("display", "none")
    d3.select("#intro").style("display", "none")

    showImages(['img-excel-1'])
  })

  addStep(function() {
    d3.select("#graphic").style("display", "block")
    showImages([])
    display(word)
    writeWord("HELLO")
    d3.selectAll("#word .number")
      .style("display", "none")
  })

  addStep(function() {
    d3.selectAll("#word .number")
      .attr("data-current", 0)
      .text('0')
    writeWord("HELLO")
    d3.selectAll("#word .number")
      .style("display", "block")
  })

  addStep(function() {
    writeWord("hELLO")
  })

  addStep(function() {
    writeWord("heLLO")
  })

  addStep(function() {
    writeWord("helLO")
  })

  addStep(function() {
    writeWord("hellO")
  })

  addStep(function() {
    display(word)
    writeWord("hello")
    updateBanner("Character encoding")
  })

  addStep(function() {
    onChart({letter: true})
    moveWordToChart()
  })

  addStep(function() {
    onChart({letter: true, digit: true})
  })  

  addStep(function() {
    onChart({letter: true, digit: true, punctuation: true})
  })

  addStep(function() {
    onChart({letter: true, digit: true, punctuation: true, control: true})
  })

  addStep(function() {
    updateBanner("US-ASCII")
  })

  addStep(function() { showImages(['img-usa']) })

  addStep(function() {
    showImages([])
    onChart({letter: true, digit: true, punctuation: true, control: true, extended: true})
    updateBanner("Latin-1")
  })

  addStep(function() {
    stopStepping()
    updateBanner("ISO 8859-1")
  })

  addStep(function() {
    display(chart)
    startStepping()
  })

  var sourceCharset = "ISO 8859-9"
  var decoderCharsets = [
    'DOS 437',
    'ISO 8859-5',
    'ISO 8859-9',
    'ISO 8859-6'
    // 'ISO 8859-6',
    // 'ISO 8859-7',
    // 'ISO 8859-8',
    // 'ISO 8859-10',
    // 'ISO 8859-11',
    // 'ISO 8859-13',
    // 'ISO 8859-14',
    // 'ISO 8859-15',
  ]

  addStep(function() {
    stopStepping()
    display(decoder)
    wordDecoder("SMÖRGÄS", sourceCharset, decoderCharsets)
    d3.selectAll(".charset-translation").style("display", "none")
  })

  decoderCharsets.forEach(function(d, stepIndex) {
    addStep(function() {
      d3.selectAll(".charset-translation")
        .classed("highlighted", false)
        .style("display", function(d, i) {
          return (stepIndex + 1) > i ? 'block' : 'none'
        })
    })
  })

  addStep(function() {
    display(decoder)
    d3.select(".charset-" + sourceCharset.replace(/ /g, '-'))
      .classed("highlighted", true)
  })

  addStep(function() {
    display(longtext)
    longText(
      "Sıradanlıktan sıradanlıktan adresini çakıl gülüyorum filmini mi mıknatıslı okuma sayfası cezbelendi bilgiyasayarı anlamsız uzattı bahar masaya doğru. Çobanın lakin sokaklarda lakin düşünüyor. Filmini mi koştum adanaya sinema lakin sevindi ötekinden dolayı adanaya dışarı çıktılar beğendim lakin lakin. Adanaya beğendim değerli olduğu için çobanın masaya doğru dışarı çıktılar lambadaki lambadaki gördüm çünkü.", 
      "ISO 8859-9"
    )
  })

  addStep(function() {
    startStepping()
  })

  addStep(function() {
    stopStepping()
    display(squares)
    
    var big = squares.append("g")
      .attr("class", "square")
      .attr("transform", "translate(0,0)")

    big.append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("height", SIDE_LENGTH)
      .attr("width", SIDE_LENGTH)

    big.append("text")
      .attr("x", SIDE_LENGTH / 2)
      .attr("y", SIDE_LENGTH / 2)
      .text("256")
      .attr("font-size", 100)

    updateBanner("ISO 8859: 256")
  })

  addStep(function() {
    elements = squares.selectAll(".square")
      .data(d3.range(8 * 8))
    
    elements.exit().remove()

    squareScale.domain(d3.range(8))

    entering = elements.enter()
      .append("g")
      
    entering.lower()
      .attr("class", "square")
      .attr("transform", "translate(0,0)")
      .append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("height", SIDE_LENGTH)
      .attr("width", SIDE_LENGTH)

    entering
      .append("text")
      .attr("x", SIDE_LENGTH / 2)
      .attr("y", SIDE_LENGTH / 2)
      .attr("font-size", 100)
      .text("256")
      .raise()

    squares.selectAll(".square")
      .select("rect")
      .transition()
      .duration(250)
      .attr("height", squareScale.bandwidth())
      .attr("width", squareScale.bandwidth())

    squares.selectAll(".square")
      .transition()
      .delay(250)
      .duration(250)
      .attr("transform", function(d, i) {
        var x = squareScale(i % 8)
        return "translate(" + x + ",0)"
      })
      .transition()
      .delay(250)
      .duration(250)
      .attr("transform", function(d, i) {
        var x = squareScale(i % 8)
        var y = squareScale(Math.floor(i / 8))
        return "translate(" + x + "," + y + ")"
      })

  squares.selectAll(".square")
    .select("text")
    .transition()
    .attr("x", squareScale.bandwidth() / 2)
    .attr("y", squareScale.bandwidth() / 2)
    .attr("font-size", 16)

    setTimeout(function() {
      updateBanner("Unicode 1.x: 16k")
    }, 1000)
  })

  addStep(function() {
    elements = squares.selectAll(".square")
      .data(d3.range(64 * 64))
    
    elements.exit().remove()

    squareScale.domain(d3.range(64))

    squares.selectAll(".highlight, text").remove()
    
    squares.selectAll(".square")
      .transition()
      .delay(250)
      .duration(500)
      .attr("transform", function(d, i) {
        var x = squareScale(i % 8)
        var y = squareScale(Math.floor(i / 8))
        return "translate(" + x + "," + y + ")"
      })
    
    squares.selectAll(".square")
      .select("rect")
      .transition()
      .duration(250)
      .attr("height", squareScale.bandwidth())
      .attr("width", squareScale.bandwidth())

    setTimeout(function() {
      entering = elements.enter()
        .append("g")
        .lower()
        .attr("class", "square")
        .append("rect")

      squares.selectAll(".square")
        .transition()
        .duration(0)
        .attr("transform", function(d, i) {
          var x = squareScale(i % 64)
          var y = squareScale(Math.floor(i / 64))
          return "translate(" + x + "," + y + ")"
        })

      squares.selectAll(".square")
        .select("rect")
        .attr("height", squareScale.bandwidth())
        .attr("width", squareScale.bandwidth())

      setTimeout(function() {
        updateBanner("Unicode 2.x: 1.1m")
      }, 500)

    }, 750)
  })

  addStep(function() {
    squares.selectAll(".square")
      .filter(function(d, i) {
        return i < 16 * 16 + 16 * 16
      })
      .select("rect")
      .style("fill", "pink")


    setTimeout(function() {
      var used = squares.append("text")
        .text("Used: 140k")
        .style("fill", "pink")
        .attr("x", SIDE_LENGTH / 2)
        .attr("y", squareScale.bandwidth() * 8 / 2 + 10)
        .attr("font-size", 32)
        .style("alignment-baseline", "middle")
        .attr("text-anchor", "middle")

      highlightText(used)
        .select("rect")
        .style("fill", "black")

      // var unused = squares.append("g")
      // unused.append("rect").style("fill", "black")
      var unused = squares.append("text")
        .text("Unused")
        .attr("x", SIDE_LENGTH / 2)
        .attr("y", squareScale.bandwidth() * 64 / 2 + squareScale.bandwidth() * 8 + 10)
        .attr("font-size", 32)
        .style("alignment-baseline", "middle")
        .attr("text-anchor", "middle")

      highlightText(unused)
        .select("rect")
        .style("fill", "black")
    }, 250)
  })

  // addStep(function() {
  //   squares.selectAll(".square").remove()
  //   squares.selectAll("text").remove()
  //   squares.selectAll(".highlight").remove()
  // })

  addStep(function() {
    emojiNote("🐙", "128,025", 10, 125, 10)
    emojiNote("🌮", "127,790", 100, 80, 0)
    emojiNote("👠", "128,096", 550, 50, -10)
    emojiNote("📰", "128,240", 425, 90, 5)
  })

  addStep(function() { showImages(['img-proposal']) })
  addStep(function() { showImages(['img-proposal', 'img-cricket']) })
  addStep(function() { showImages(['img-proposal', 'img-dumpling', 'img-cricket']) })

  addStep(function() {
    display();
    showImages(['img-flat'])
    d3.selectAll(".emoji-holder").remove()
  })

  addStep(function() {
    showImages(['img-flat'])

    emojiNote("👢", "128,098", 900, 200, 0, svg, 150)
    emojiNote("👠", "128,096", 750, 400, 0, svg, 150)
    emojiNote("👡", "128,097", 875, 650, 0, svg, 150)

    d3.selectAll(".emoji-holder").select("rect").style("fill", "pink")
    d3.selectAll(".emoji-holder").selectAll("text").style("fill", "black")
  })

  addStep(function() { 
    display();
    d3.selectAll(".emoji-holder").remove()
    showImages(['img-excel-1'])
  })
  addStep(function() { showImages(['img-excel-2']) })
  addStep(function() { showImages(['img-excel-2', 'img-excel-3']) })
  addStep(function() { showImages(['img-excel-2', 'img-excel-3', 'img-excel-4']) })
  addStep(function() { showImages(['img-excel-5']) })
  addStep(function() { 
    d3.select("#intro").style("display", "none")
    showImages(['img-excel-5', 'img-pandas']) 
  })

  addStep(function() {
    d3.select("#images").style("display", "none")
    d3.select("#graphic").style("display", "none")
    d3.select("#intro").style("display", "block")
  })

  var currentStep = 0
  runStep()
})()