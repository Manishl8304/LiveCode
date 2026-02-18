import mongoose from "mongoose";

/*
1)mongoose
 - mongoose is an object imported from mongoose library
 - it contains various functions(.connect(), .model()) and a class(Schema())

 - model funtion is used to create a model(table), it takes two parameter (String modelName, Schema modelSchema) and returns a mongoose model class which will be used to alter table, for ex User.find({}), User.create({})

 - Schema is a class which takes an object to create a class instance, u can also pass additional object {timestamps:true} for storing createdAt, updatedAt on each change in the model.
*/

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
  },
  { timestamps: true },
);

const User = mongoose.model("User", userSchema);
export default User;
