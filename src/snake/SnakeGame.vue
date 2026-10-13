<template>
  <div class="game-area">
    <div class="snake-body" v-for="(item,index) in snakeBody" :key="index" :class="[index === 0 ? 'snakeHead':'',index === 0 ? 'snake-d-' + snake.d:'']" :style="{left:item.x * gridSize+'px',top:item.y * gridSize+'px'}"></div>
    <div class="food" :style="{left:food.x * gridSize+'px',top:food.y * gridSize+'px'}"></div>
  </div>
</template>
<script>
export default {
  name: 'SnakeGame',
  data() {
    return {
      snake:{d:6},
      snakeBody:[{x:0,y:0}],
      food:{x:0, y:0},
      gridSize:20,
      screenGrid:{width:640 / 20, height:480 / 20},
      timer:null,
      dc:0,
    }
  },
  methods:{
    init(){
      this.createRandomFood();
      this.start();
      this.listenKeyboard();
    },
    createRandomFood(){
      let x = Math.floor(Math.random() * this.screenGrid.width);
      let y = Math.floor(Math.random() * this.screenGrid.height);
      let flag = false;
      for(let i = 0;i < this.snakeBody.length;i++){
        if(this.snakeBody[i].x === x && this.snakeBody[i].y === y){
          flag = true;
          break;
        }
      }
      if(flag){
        this.createRandomFood();
      }else{
        this.food.x = x;
        this.food.y = y;
      }
    },
    checkEdge(d){
      let snakeHead = this.snakeBody[0];
      if(d === 6 && snakeHead.x === this.screenGrid.width - 1){
        return true;
      }else if(d === 4 && snakeHead.x === 0){
        return true;
      }else if(d === 8 && snakeHead.y === this.screenGrid.height - 1){
        return true;
      }else if(d === 2 && snakeHead.y === 0){
        return true;
      }
      return false;
    },
    start(){
      this.timer = setInterval(()=>{
        if (this.checkEdge(this.snake.d) || this.checkTouchSelf()){
          clearInterval(this.timer);
          alert("游戏结束");
          return;
        }
        if(this.checkTouchFood()){
          this.createRandomFood();
          this.snakeBody.push({x:0,y:0});
        }
        this.move();
      },200);
    },
    move(){
      if(this.dc){
        this.snake.d = this.dc;
        this.dc = 0;
      }
      let snakeHead = this.snakeBody[0];
      let newSnakeHead = {x:snakeHead.x, y:snakeHead.y};
      if(this.snake.d === 6){
        newSnakeHead.x++;
      }else if(this.snake.d === 4){
        newSnakeHead.x--;
      }else if(this.snake.d === 8){
        newSnakeHead.y++;
      }else if(this.snake.d === 2){
        newSnakeHead.y--;
      }
      this.snakeBody.unshift(newSnakeHead);
      this.snakeBody.pop();
    },
    push(d){
      let snakeHead = this.snakeBody[0];
      let newSnake = {x:snakeHead.x, y:snakeHead.y};
      this.snakeBody.unshift(newSnake);
    },
    checkTouchFood(){
      let snakeHead = this.snakeBody[0];
      if(snakeHead.x === this.food.x && snakeHead.y === this.food.y){
        this.createRandomFood();
        return true;
      }
      return false;
    },
    // 检查是否撞到自己
    checkTouchSelf(){
      let snakeHead = this.snakeBody[0];
      for(let i = 1;i < this.snakeBody.length;i++){
        if(snakeHead.x === this.snakeBody[i].x && snakeHead.y === this.snakeBody[i].y){
          return true;
        }
      }
      return false;
    },
    // 监听键盘的上下左右
    listenKeyboard(e){
      document.onkeydown =  (e) => {
        let key = e.keyCode;
        if(key === 37){
          if(this.snake.d === 6){
            return;
          }
          this.dc = 4;
        }else if(key === 38){
          if(this.snake.d === 8){
            return;
          }
          this.dc = 2;
        }else if(key === 39){
          if(this.snake.d === 4){
            return;
          }
          this.dc = 6;
        }else if(key === 40){
          if(this.snake.d === 2){
            return;
          }
          this.dc = 8;
        }
      }
    }
  },
  created(){
    this.init();
  },
}
</script>
