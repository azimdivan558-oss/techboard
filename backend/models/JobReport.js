import mongoose from "mongoose";

const schema=new mongoose.Schema({
  job: {
    type:mongoose.Schema.Types.ObjectId, ref:"JobPost", required:true
  }

  , reportedBy: {
    type:mongoose.Schema.Types.ObjectId, ref:"User", required:true
  }

  , reason: {
    type:String, enum:["Fake job", "Fraud", "Wrong information", "Spam", "Other"], required:true
  }

  , details: {
    type:String, default:""
  }

  , status: {
    type:String, enum:["Open", "Reviewed", "Dismissed"], default:"Open"
  }
}

, {
timestamps:true
});

schema.index({
  job:1, reportedBy:1
}

, {
unique:true
});
export default mongoose.model("JobReport", schema);