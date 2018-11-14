class Grid {
    /**
     * Error Handling
     * 
     * @param {string} msg - Message to display
     */
    errorHandler(msg) {
        throw new Error(msg);
    }
    
    /**
     * Setup the object, Processes Options & Loads the images
     * 
     * @param {string} id: the HTML `ID` of the canvas object
     * @param {object} options: {rows:5, cols:5}
     * 
     */
    constructor(id, options) {
        this.images = {};
        this.loaded = {};

        //#region Init the element
        this.element = document.getElementById(id) ? 
            this.element = document.getElementById(id) : 
            this.errorHandler(`Invalid Element ${id}`);
        
        if (this.element.getContext) {
            this.ctx = this.element.getContext('2d');
        } else {
            this.errorHandler(`Element ${id} does not support canvas`);
        }
        //#endregion

        //#region Options
        function setOption(key, defaultValue, options) {
            if (options) {
                return key in options ? options[key] : defaultValue;
            } else {
                return defaultValue;
            }
        }

        this.rows = setOption('rows', 10, options);
        this.cols = setOption('cols', 10, options);
        this.extraCellData = setOption('extraCellData', {}, options);
        this.cellWidth = setOption('cellWidth', 50, options);
        this.cellHeight = setOption('cellHeight', 50, options);
        this.background = setOption('background', '#FFF', options);
        this.mouseEvent = setOption('mouseEvent', function(){}, options);
        this.nudge = setOption('nudge', 0, options);
        //#endregion

        //#region Create Grid Data array
        this.gridData = [];

        for (var row=0; row<=this.rows-1; row++) {
            var Col = [];

            for (var col=0; col<=this.cols-1; col++) {
                Col.push(Object.assign({}, {icon:false,visible:false}, this.extraCellData));
            }
            this.gridData.push(Col);
        }
        //#endregion

        //#region Load The Images
        if ('images' in options) {
            var instance = this;
            for (var image of Object.keys(options['images'])) {
                this.loaded[image] = false;
                this.images[image] = document.createElement('img');
                this.images[image].setAttribute('gridIcon', image);
                this.images[image].onload = function(event) {
                    instance.loaded[event.target.getAttribute('gridIcon')] = true;
                    d(`Loaded Image: ${event.target.getAttribute('gridIcon')}`);
                }
                this.images[image].src = options['images'][image];
            }
        }
        //#endregion

        //#region Compute grid size
        this.width  = (this.cellWidth * this.cols) + this.cols + 1;
        this.height = (this.cellHeight * this.rows) + this.rows + 1;
        //#endregion

        //#region Mouse events
        var instance = this;
        this.element.addEventListener("mousemove", function(event) {instance.mouseHandler(event, 'move')});
        this.element.addEventListener("click", function(event) {instance.mouseHandler(event, 'click')});
        this.element.addEventListener("contextmenu", function(event) {
            event.preventDefault();
            instance.mouseHandler(event, 'rightClick');
        });
        //#endregion

        //#region Update the grid canvas
        this.element.style.width  = this.width;
        this.element.style.height = this.height;
        this.ctx.canvas.height = this.height;
        this.ctx.canvas.width  = this.width;
        this.ctx.scale         = 1;
        //#endregion

        // Draw
        this.renderGrid();
    }

    /**
     * Get the grid data for a cell
     * 
     * ex this.get(5, 5);
     * 
     * @param {num} row - Zero Based
     * @param {num} col - Zero Based
     * @return {object} - cell
     */
    get(row, col) {
        if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) {
            return false;
        } else {
            return this.gridData[row][col];
        }
    }

    /**
     * Populate a cell with new data
     * 
     * ex. this.set(5, 5, {icon: changeThis})
     * 
     * @param {num} row - Zero Based
     * @param {num} col - Zero Based
     * @param {obj} newData - {icon:"", visible:""}
     * @return {object} - chainable
     */
    set(row, col, newData) {
        var data = this.get(row, col);

        for (var keys of Object.keys(newData)) 
            data[keys] = newData[keys];

        this.gridData[row][col] = data;
        return this.gridData[row][col];
    }

    /**
     * Return the number of cells that have this attribute
     * you can use an array for multiple values
     * 
     * ex. this.count('lookingFor', findMe);
     * ex. this.count('lookingFor', [findMe, findMe1, findMe2]);
     * 
     * @param {string} data 
     * @param {string/array} key 
     * @return {num} 
     */
    count(data, key) {
        var keys  = (Array.isArray(key)) ? key : [key];
        var count = 0;

        for (var row=0; row<=this.rows-1; row++) {
            for (var col=0; col<=this.cols-1; col++) {
                if (keys.includes(this.gridData[row][col][data])) {
                    count += 1;
                }
            }
        }

        return count ;
    }

    /**
     * Return the cells that have this attribute
     * you can use an array for multiple values
     * 
     * ex. this.find('lookingFor', findMe);
     * ex. this.find('lookingFor', [findMe, findMe1, findMe2]);
     * 
     * @param {string} data 
     * @param {string/array} key 
     * @return {array} 
     */
    find(key, value) {
        var values = (Array.isArray(value)) ? value : [value];
        var retval = [];

        for (var row=0; row<=this.rows-1; row++) {
            for (var col=0; col<=this.cols-1; col++) {
                if (values.includes(this.gridData[row][col][key])) {
                    var tmp = this.gridData[row][col];
                    tmp['row'] = row;
                    tmp['col'] = col;
                    
                    retval.push(tmp);
                }
            }
        }

        return retval;
    }

    /**
     * Apply this attribute to every cell
     * 
     * ex. this.apply('icon', 'empty');
     * ex. this.apply('icon', 'empty', 'visible', true);
     * 
     * @param {string} data 
     * @param {string} value 
     * @param {string} filterKey
     * @param {string} filterValue
     * @return {object} - chainable
     */
    apply(data, value, fKey=null, fValue=null) {

        if (fKey) {
            fValue = (Array.isArray(fValue)) ? 
                fValue : [fValue];
        }

        for (var row=0; row<=this.rows-1; row++) {
            for (var col=0; col<=this.cols-1; col++) {
                if (fKey) {
                    if (fValue.includes(this.gridData[row][col][fKey]))
                    this.gridData[row][col][data] = value;
                } else {
                    this.gridData[row][col][data] = value;
                }
            }
        }

        return this;
    }

    /**
     * Returns the (x, y) coordinates of a cell
     * 
     * ex. this.position(5, 5);
     * 
     * @param {num} row 
     * @param {num} col 
     * @return {object} - {x, y}
     */
    position(row, col) {
        return {
            x: (col * (this.cellWidth + 1))+1,
            y: (row * (this.cellHeight + 1))+1
        }
    }

    /**
     * Mouse Handler, Sends events to this.mouseEvent
     * 
     * @param {event} event 
     * @param {string} type 
     */
    mouseHandler(event, type) {
        //#region get row and col
        var canvasPos = this.element.getBoundingClientRect();
        var x = event.clientX - canvasPos.left;
        var y = event.clientY - canvasPos.top;
        
        var row = Math.floor(y / (this.cellHeight+1));
        var col = Math.floor(x / (this.cellWidth+1));

        if (row == this.rows) row = this.rows - 1;
        if (col == this.cols) col = this.cols - 1;
        //#endregion

        //#region Build results
        var results = {
            action:type, 
            row:row, 
            col:col
        }

        var data = this.get(row, col);
        for (var keys of Object.keys(data)) {
            results[keys] = data[keys];
        }
        //#endregion

        this.mouseEvent(results);
    }

    /**
     * Change the cursor
     * 
     * ex. this.cursor('pointer');
     * 
     * @param {string} name - auto, default, grab, help, move, pointer, not-allowed
     * @return {object} - chainable
     */
    cursor(name) {
        this.element.style.cursor = name;
        return this;
    }

    /**
     * Had the image completed loading?
     * 
     * ex. this.isLoaded("bomb")
     * 
     * @param {string} name 
     * @return {bool}
     */
    isLoaded(name) {
        if (name in this.loaded) {
            return this.loaded[name];
        } else this.errorHandler(`${name} is not a pre-loaded image`);
    }

    /**
     * Reveal a cell (you can supply new data)
     * 
     * ex. this.show(5, 5, {icon: changeThis})
     * 
     * @param {num} row - Zero Based
     * @param {num} col - Zero Based
     * @param {obj} newData - {icon:"", visible:""}
     * @return {object} - chainable
     */
    show(row, col, newData={}) {
        newData['visible'] = true;
        var data = this.set(row, col, newData);
        this.draw(row, col, data.icon);
        return this;
    }

    /**
     * Hide a cell (you can supply new data)
     * 
     * ex. this.hide(5, 5, {icon: changeThis})
     * 
     * @param {num} row - Zero Based
     * @param {num} col - Zero Based
     * @param {obj} newData - {icon:"", visible:""}
     * @return {object} - chainable
     */
    hide(row, col, newData={}) {
        newData['visible'] = false;
        var data = this.set(row, col, newData);
        this.erase(row, col);
        return this;
    }

    /**
     * FadeIn an cell on the grid
     * 
     * Internal do not call directly
     * 
     * @param {HTML Object} surface 
     * @param {num} x 
     * @param {num} y 
     * @param {num} h 
     * @param {num} w 
     * @param {num} alpha 
     */
    fadeIn(image, surface, x, y, h, w, alpha=.1) {
        var ctx = surface.getContext('2d');
        ctx.globalAlpha = alpha;
        ctx.drawImage(image, x, y, h, w);
        
        if (alpha < 1) {
            var instance = this;
            setTimeout(function() {
                instance.fadeIn(image, surface, x, y, h, w, alpha + .1);
            }, 50);
        }
    }

    /**
     * Really a FadeIn of an empty rectangle
     * 
     * Internal do not call directly
     * 
     * @param {HTML Object} surface 
     * @param {num} x 
     * @param {num} y 
     * @param {num} h 
     * @param {num} w 
     * @param {num} alpha 
     */
    fadeOut(surface, x, y, h, w, alpha=.1) {
        var ctx = surface.getContext('2d');
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.background;
        ctx.fillRect(x, y, h, w);

        if (alpha < 1) {
            var instance = this;
            setTimeout(function() {
                instance.fadeOut(surface, x, y, h, w, alpha + .1);
            }, 50);
        }
    }

    /**
     * Draw a tile on the grid
     * 
     * ex. this.draw(5, 5, 'bomb');
     * 
     * @param {num} row - Zero based
     * @param {num} col - Zero based
     * @param {string} name - Name of the image
     */
    draw(row, col, name) {
        var cell = this.position(row, col);

        if (this.isLoaded(name)) {
            this.gridData[row][col].visible = true;
            this.fadeIn(this.images[name], this.element, cell.x, cell.y, this.cellWidth, this.cellHeight);
        } else {
            //
            // If the image isn't loaded yet, call this fn again
            //
            var instance = this;
            setTimeout(function() { instance.draw(row, col, name); }, 100);
        } 
    }
    
    /**
     * Erase a rectangle over a tile (uses background color)
     * 
     * ex. this.erase(5, 5);
     * 
     * @param {num} row 
     * @param {num} col 
     */
    erase(row, col) {
        var cell = this.position(row, col);
        this.gridData[row][col].visible = false;
        this.fadeOut(this.element, cell.x, cell.y, this.cellWidth, this.cellHeight);
    }

    /**
     * Draw the Grid
     * 
     * Internal do not call directly
     * 
     */
    renderGrid() {
        // Clear Canvas
        this.ctx.fillStyle = '#888';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Draw
        for (var col=0; col<=this.cols; col++) {
            for (var row=0; row<=this.rows; row++) {
                var cell = this.position(row, col);
                this.ctx.fillStyle = this.background;
                this.ctx.fillRect(cell.x, cell.y, this.cellWidth, this.cellHeight);
            }
        }

    }
}
