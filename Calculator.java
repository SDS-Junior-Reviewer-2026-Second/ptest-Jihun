public class Calculator {

    private int result;

    public void plus(int a, int b){
        result = a + b;
    }
    public void minus(int a, int b){
        result = a - b;
    }
    public void divide(int a, int b){
        result = a / b;
    }
    public void multiple(int a, int b){
        result = a * b;
    }

    public int printResult(){
        return result;
    }
}
