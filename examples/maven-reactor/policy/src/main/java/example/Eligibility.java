package example;

public final class Eligibility {
    private Eligibility() { }
    public static boolean eligible(boolean active, int stock) {
        return active && stock > 0;
    }
}
